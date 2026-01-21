const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const bs58Mod = require('bs58');
const bs58 = bs58Mod && bs58Mod.default ? bs58Mod.default : bs58Mod;

const {
  buildOutputsRel,
  buildTxIndexRecord,
  buildNoirforgeVerifyIndexRecord,
  buildIndexReport,
  extractInstructionDataForProgram,
  fetchHeliusEnhancedTransactions,
  heliusEnhancedBaseUrlFromCluster,
  parseArgs,
  resolveProgramIdFromManifest,
  findRepoRoot,
  readToolVersions,
  getRpcEndpoints,
  getWsEndpoints,
} = require('../bin/noirforge.js');

test('parseArgs collects flags and positional args', () => {
  const got = parseArgs(['--foo', 'bar', 'x', '--baz', 'qux', 'y']);
  assert.deepEqual(got, { _: ['x', 'y'], foo: 'bar', baz: 'qux' });
});

test('getWsEndpoints: explicit --ws-url overrides provider selection', () => {
  const keys = ['NOIRFORGE_RPC_PROVIDER', 'NOIRFORGE_QUICKNODE_WS_URL', 'NOIRFORGE_WS_URL'];
  const prev = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    process.env.NOIRFORGE_RPC_PROVIDER = 'quicknode';
    process.env.NOIRFORGE_QUICKNODE_WS_URL = 'wss://quicknode-ws';

    const got = getWsEndpoints({ 'ws-url': 'wss://explicit-ws', 'rpc-provider': 'quicknode' });
    assert.deepEqual(got, ['wss://explicit-ws']);
  } finally {
    for (const k of keys) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  }
});

test('getWsEndpoints: auto-selects quicknode when quicknode ws env endpoints are present', () => {
  const keys = ['NOIRFORGE_RPC_PROVIDER', 'NOIRFORGE_WS_URL', 'NOIRFORGE_WS_ENDPOINTS', 'NOIRFORGE_QUICKNODE_WS_ENDPOINTS'];
  const prev = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    for (const k of ['NOIRFORGE_RPC_PROVIDER', 'NOIRFORGE_WS_URL', 'NOIRFORGE_WS_ENDPOINTS']) delete process.env[k];
    process.env.NOIRFORGE_QUICKNODE_WS_ENDPOINTS = 'wss://qws1, wss://qws2';

    const got = getWsEndpoints({});
    assert.deepEqual(got, ['wss://qws1', 'wss://qws2']);
  } finally {
    for (const k of keys) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  }
});

test('buildTxIndexRecord normalizes transaction metadata', () => {
  const txInfo = {
    slot: 123,
    blockTime: 456,
    meta: {
      fee: 789,
      computeUnitsConsumed: 999,
      err: null,
    },
  };

  const rec = buildTxIndexRecord({
    signature: 'sig',
    cluster: 'devnet',
    rpcEndpoint: 'https://rpc',
    txInfo,
    now: 0,
  });

  assert.deepEqual(rec, {
    kind: 'tx',
    fetched_at: new Date(0).toISOString(),
    signature: 'sig',
    cluster: 'devnet',
    rpc_endpoint: 'https://rpc',
    slot: 123,
    block_time: 456,
    fee_lamports: 789,
    compute_units: 999,
    err: null,
  });
});

test('extractInstructionDataForProgram finds and decodes instruction data for a program id', () => {
  const programId = '11111111111111111111111111111111';
  const payload = Buffer.from([1, 2, 3, 4, 5]);

  const txInfo = {
    transaction: {
      message: {
        accountKeys: [programId],
        compiledInstructions: [{ programIdIndex: 0, data: bs58.encode(payload) }],
      },
    },
  };

  const chunks = extractInstructionDataForProgram(txInfo, programId);
  assert.equal(chunks.length, 1);
  assert.equal(Buffer.isBuffer(chunks[0]), true);
  assert.deepEqual([...chunks[0]], [...payload]);
});

test('buildNoirforgeVerifyIndexRecord emits noirforge_verify when tx contains matching program instruction', () => {
  const programId = '11111111111111111111111111111111';
  const payload = Buffer.from([9, 8, 7]);
  const signature = 'sig';

  const txInfo = {
    slot: 123,
    blockTime: 456,
    meta: {
      fee: 789,
      computeUnitsConsumed: 999,
      err: null,
    },
    transaction: {
      message: {
        accountKeys: [programId],
        compiledInstructions: [{ programIdIndex: 0, data: bs58.encode(payload) }],
      },
    },
  };

  const rec = buildNoirforgeVerifyIndexRecord({
    signature,
    cluster: 'devnet',
    rpcEndpoint: 'https://rpc',
    txInfo,
    programId,
    artifactName: 'a',
    manifestName: 'm',
    now: 0,
  });

  assert.deepEqual(rec, {
    kind: 'noirforge_verify',
    fetched_at: new Date(0).toISOString(),
    signature: 'sig',
    cluster: 'devnet',
    rpc_endpoint: 'https://rpc',
    slot: 123,
    block_time: 456,
    program_id: programId,
    artifact_name: 'a',
    manifest_name: 'm',
    ok: true,
    err: null,
    fee_lamports: 789,
    compute_units: 999,
    verify_instruction_count: 1,
    instruction_data_len: 3,
  });
});

test('buildNoirforgeVerifyIndexRecord returns null when tx has no matching program instructions', () => {
  const txInfo = {
    transaction: {
      message: {
        accountKeys: ['11111111111111111111111111111111'],
        compiledInstructions: [{ programIdIndex: 0, data: bs58.encode(Buffer.from([1])) }],
      },
    },
  };

  const rec = buildNoirforgeVerifyIndexRecord({
    signature: 'sig',
    cluster: 'devnet',
    rpcEndpoint: 'https://rpc',
    txInfo,
    programId: '22222222222222222222222222222222',
    now: 0,
  });

  assert.equal(rec, null);
});

test('buildIndexReport summarizes noirforge_verify records (totals, percentiles, grouping)', () => {
  const mk = (lagSeconds) => ({ fetched_at: new Date(lagSeconds * 1000).toISOString(), block_time: 0 });
  const records = [
    {
      kind: 'noirforge_verify',
      ok: true,
      artifact_name: 'a',
      program_id: 'p1',
      compute_units: 100,
      fee_lamports: 10,
      instruction_data_len: 50,
      ...mk(10),
    },
    {
      kind: 'noirforge_verify',
      ok: false,
      artifact_name: 'a',
      program_id: 'p1',
      compute_units: 300,
      fee_lamports: 30,
      instruction_data_len: 70,
      ...mk(30),
    },
    {
      kind: 'noirforge_verify',
      ok: true,
      artifact_name: 'b',
      program_id: 'p2',
      compute_units: 200,
      fee_lamports: 20,
      instruction_data_len: 60,
      ...mk(20),
    },
    { kind: 'tx' },
  ];

  const rep = buildIndexReport(records, { now: 0 });

  assert.equal(rep.kind, 'noirforge_index_report');
  assert.equal(rep.generated_at, new Date(0).toISOString());

  assert.deepEqual(rep.totals, {
    verify_count: 3,
    ok_count: 2,
    err_count: 1,
    ok_rate: 2 / 3,
  });

  assert.deepEqual(rep.compute_units, {
    count: 3,
    min: 100,
    max: 300,
    mean: 200,
    p50: 200,
    p95: 200,
  });

  assert.deepEqual(rep.index_lag_seconds, {
    count: 3,
    min: 10,
    max: 30,
    mean: 20,
    p50: 20,
    p95: 20,
  });

  assert.equal(rep.by_artifact.a.verify_count, 2);
  assert.equal(rep.by_artifact.b.verify_count, 1);
  assert.equal(rep.by_program.p1.verify_count, 2);
  assert.equal(rep.by_program.p2.verify_count, 1);
});

test('resolveProgramIdFromManifest prefers verify_onchain_program_id, then deployed_program_id', () => {
  const m = {
    outputs: {
      deployed_program_id: 'deployed',
      verify_onchain_program_id: 'verify',
    },
  };
  assert.equal(resolveProgramIdFromManifest(m), 'verify');
});

test('resolveProgramIdFromManifest falls back to built program ids when no deployed ids are present', () => {
  const m = {
    outputs: {
      program_id: 'p',
      built_program_id: 'b',
    },
  };
  assert.equal(resolveProgramIdFromManifest(m), 'p');
});

test('resolveProgramIdFromManifest returns null for missing/invalid outputs', () => {
  assert.equal(resolveProgramIdFromManifest(null), null);
  assert.equal(resolveProgramIdFromManifest({}), null);
  assert.equal(resolveProgramIdFromManifest({ outputs: {} }), null);
});

test('heliusEnhancedBaseUrlFromCluster maps devnet and defaults to mainnet', () => {
  assert.equal(heliusEnhancedBaseUrlFromCluster('devnet'), 'https://api-devnet.helius-rpc.com');
  assert.equal(heliusEnhancedBaseUrlFromCluster('mainnet-beta'), 'https://api-mainnet.helius-rpc.com');
  assert.equal(heliusEnhancedBaseUrlFromCluster('https://custom.invalid'), 'https://api-mainnet.helius-rpc.com');
});

test('fetchHeliusEnhancedTransactions posts signatures and returns parsed JSON', async () => {
  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      json: async () => [{ signature: 'sig1', type: 'UNKNOWN' }],
    };
  };

  const out = await fetchHeliusEnhancedTransactions({
    apiKey: 'k',
    cluster: 'devnet',
    signatures: ['sig1'],
    fetchFn: fakeFetch,
  });

  assert.deepEqual(out, [{ signature: 'sig1', type: 'UNKNOWN' }]);
  assert.equal(calls.length, 1);
  assert.ok(String(calls[0].url).startsWith('https://api-devnet.helius-rpc.com/v0/transactions?api-key='));
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers['content-type'], 'application/json');
  assert.equal(calls[0].init.body, JSON.stringify({ transactions: ['sig1'] }));
});

test('parseArgs stops at -- and keeps remainder as positional args', () => {
  const got = parseArgs(['--foo', 'bar', '--', 'x', '--baz', 'qux']);
  assert.deepEqual(got, { _: ['x', '--baz', 'qux'], foo: 'bar' });
});

test('parseArgs supports boolean --relative-paths-only', () => {
  const got = parseArgs(['--relative-paths-only', '--foo', 'bar']);
  assert.deepEqual(got, { _: [], 'relative-paths-only': true, foo: 'bar' });
});

test('parseArgs supports boolean --final', () => {
  const got = parseArgs(['--final', '--foo', 'bar']);
  assert.deepEqual(got, { _: [], final: true, foo: 'bar' });
});

test('parseArgs supports boolean --allow-mainnet', () => {
  const got = parseArgs(['--allow-mainnet', '--foo', 'bar']);
  assert.deepEqual(got, { _: [], 'allow-mainnet': true, foo: 'bar' });
});

test('buildOutputsRel makes paths relative to artifact dir and leaves non-path strings unchanged', () => {
  const outDir = '/tmp/noirforge-test-out';
  const outputs = {
    acir_json: path.join(outDir, 'circuit.json'),
    vk: path.join(outDir, 'sub', 'circuit.vk'),
    program_id: 'CJZ8zPFdWmJ9CKyiiKWJVwAKuDFsrtYGBm8z7QkPJYgM',
    prover_name: 'groth16',
  };

  const rel = buildOutputsRel(outDir, outputs);
  assert.equal(rel.acir_json, 'circuit.json');
  assert.equal(rel.vk, path.join('sub', 'circuit.vk'));
  assert.equal(rel.program_id, outputs.program_id);
  assert.equal(rel.prover_name, outputs.prover_name);
});

test('findRepoRoot finds the nearest ancestor containing tool-versions', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'noirforge-cli-test-'));
  const nested = path.join(root, 'a', 'b', 'c');
  await fs.mkdir(nested, { recursive: true });

  await fs.writeFile(path.join(root, 'tool-versions'), 'nodejs 20.0.0\n', 'utf8');

  const found = await findRepoRoot(nested);
  assert.equal(found, root);
});

test('readToolVersions parses tool-versions into a key/value map', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'noirforge-cli-test-'));
  const contents = ['# comment', 'nodejs 20.0.0', 'rust 1.90.0', '', ''].join('\n');
  await fs.writeFile(path.join(root, 'tool-versions'), contents, 'utf8');

  const tv = await readToolVersions(root);
  assert.equal(tv.nodejs, '20.0.0');
  assert.equal(tv.rust, '1.90.0');
});

test('getRpcEndpoints: explicit --rpc-url overrides provider selection', () => {
  const web3 = { clusterApiUrl: (c) => `https://cluster/${c}` };

  const keys = ['NOIRFORGE_RPC_PROVIDER', 'NOIRFORGE_QUICKNODE_RPC_URL'];
  const prev = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    process.env.NOIRFORGE_RPC_PROVIDER = 'quicknode';
    process.env.NOIRFORGE_QUICKNODE_RPC_URL = 'https://quicknode';

    const got = getRpcEndpoints(web3, 'devnet', { 'rpc-url': 'https://explicit' });
    assert.deepEqual(got, ['https://explicit']);
  } finally {
    for (const k of keys) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  }
});

test('getRpcEndpoints: auto-selects quicknode when quicknode env endpoints are present', () => {
  const web3 = { clusterApiUrl: (c) => `https://cluster/${c}` };

  const keys = ['NOIRFORGE_RPC_PROVIDER', 'NOIRFORGE_RPC_URL', 'NOIRFORGE_RPC_ENDPOINTS', 'NOIRFORGE_QUICKNODE_RPC_ENDPOINTS'];
  const prev = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    for (const k of ['NOIRFORGE_RPC_PROVIDER', 'NOIRFORGE_RPC_URL', 'NOIRFORGE_RPC_ENDPOINTS']) delete process.env[k];

    process.env.NOIRFORGE_QUICKNODE_RPC_ENDPOINTS = 'https://q1, https://q2';

    const got = getRpcEndpoints(web3, 'devnet', {});
    assert.deepEqual(got, ['https://q1', 'https://q2']);
  } finally {
    for (const k of keys) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  }
});

test('getRpcEndpoints: falls back to cluster when no explicit/provider endpoints are configured', () => {
  const web3 = { clusterApiUrl: (c) => `https://cluster/${c}` };

  const keys = [
    'NOIRFORGE_RPC_PROVIDER',
    'NOIRFORGE_RPC_URL',
    'NOIRFORGE_RPC_ENDPOINTS',
    'NOIRFORGE_QUICKNODE_RPC_URL',
    'NOIRFORGE_QUICKNODE_RPC_ENDPOINTS',
    'NOIRFORGE_HELIUS_RPC_URL',
    'NOIRFORGE_HELIUS_RPC_ENDPOINTS',
  ];
  const prev = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    for (const k of keys) delete process.env[k];

    const got = getRpcEndpoints(web3, 'devnet', {});
    assert.deepEqual(got, ['https://cluster/devnet']);
  } finally {
    for (const k of keys) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  }
});
