const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  buildInstructionData,
  buildVerifyInstruction,
  assertValidManifestV1,
  loadManifest,
  loadManifestV1,
  NoirforgeSdkError,
  RpcError,
  RpcProvider,
  rpcUrlFromCluster,
  resolveOutputs,
  validateManifestV1,
} = require('../dist/index.js');

const { PublicKey } = require('@solana/web3.js');

function parseKvText(txt) {
  const out = {};
  for (const line of String(txt)
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean)) {
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}

test('loadManifest reads and parses JSON', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'noirforge-sdk-ts-'));
  try {
    const p = path.join(dir, 'noirforge.json');
    const obj = { schema_version: 1, name: 'x', outputs: { a: 1 } };
    await fs.writeFile(p, JSON.stringify(obj), 'utf8');
    const got = await loadManifest(p);
    assert.equal(got.schema_version, 1);
    assert.equal(got.name, 'x');
    assert.deepEqual(got.outputs, { a: 1 });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('loadManifestV1 reads and validates noirforge manifest v1', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'noirforge-sdk-ts-'));
  try {
    const p = path.join(dir, 'noirforge.json');
    const obj = {
      schema_version: 1,
      name: 'sum_a_b',
      created_at: new Date().toISOString(),
      circuit_dir: null,
      proving_system: 'groth16',
      outputs: {
        proof: 'proof.bin',
        public_witness: null,
      },
    };
    await fs.writeFile(p, JSON.stringify(obj), 'utf8');

    const got = await loadManifestV1(p);
    assert.equal(got.schema_version, 1);
    assert.equal(got.name, 'sum_a_b');
    assert.equal(got.proving_system, 'groth16');
    assert.equal(got.circuit_dir, null);
    assert.deepEqual(got.outputs, { proof: 'proof.bin', public_witness: null });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('validateManifestV1 rejects invalid manifests and assertValidManifestV1 throws', () => {
  const bad = {
    schema_version: 2,
    name: '',
    created_at: '',
    circuit_dir: 123,
    proving_system: '',
    outputs: { ok: 'x', bad: 1 },
  };

  const res = validateManifestV1(bad);
  assert.equal(res.ok, false);
  assert.ok(res.errors.length > 0);

  assert.throws(
    () => assertValidManifestV1(bad),
    (e) => e instanceof NoirforgeSdkError && String(e.message).includes('Invalid noirforge manifest')
  );
});

test('resolveOutputs resolves file-path outputs_rel but does not path-resolve metadata keys', () => {
  const artifactDir = path.join(path.sep, 'tmp', 'artifact');
  const manifest = {
    outputs: {
      program_id: 'CJZ8zPFdWmJ9CKyiiKWJVwAKuDFsrtYGBm8z7QkPJYgM',
    },
    outputs_rel: {
      proof: 'proof.bin',
      public_witness: 'witness.pw',
      program_id: 'CJZ8zPFdWmJ9CKyiiKWJVwAKuDFsrtYGBm8z7QkPJYgM',
      verify_onchain_signature: 'abc123',
      verify_onchain_cluster: 'devnet',
    },
  };

  const out = resolveOutputs(manifest, artifactDir);

  assert.equal(out.program_id, manifest.outputs.program_id);
  assert.equal(out.verify_onchain_signature, 'abc123');
  assert.equal(out.verify_onchain_cluster, 'devnet');

  assert.equal(out.proof, path.resolve(artifactDir, 'proof.bin'));
  assert.equal(out.public_witness, path.resolve(artifactDir, 'witness.pw'));
});

test('buildInstructionData concatenates proof and public witness bytes', () => {
  const a = Buffer.from([1, 2, 3]);
  const b = Buffer.from([4, 5]);
  const out = buildInstructionData(a, b);
  assert.deepEqual([...out], [1, 2, 3, 4, 5]);
});

test('buildInstructionData matches golden instruction-data-v1 test vector', async () => {
  const repoRoot = path.resolve(__dirname, '../../..');
  const p = path.join(repoRoot, 'test-vectors', 'instruction-data-v1.txt');
  const txt = await fs.readFile(p, 'utf8');
  const kv = parseKvText(txt);

  const proof = Buffer.from(kv.proof_hex, 'hex');
  const witness = Buffer.from(kv.public_witness_hex, 'hex');
  const expected = Buffer.from(kv.instruction_data_hex, 'hex');

  const got = buildInstructionData(proof, witness);
  assert.equal(got.toString('hex'), expected.toString('hex'));
});

test('buildVerifyInstruction creates instruction with empty accounts', () => {
  const pid = new PublicKey('11111111111111111111111111111111');
  const data = Buffer.from([9, 10]);
  const ix = buildVerifyInstruction(pid, data);
  assert.equal(ix.programId.toBase58(), pid.toBase58());
  assert.equal(ix.keys.length, 0);
  assert.deepEqual([...ix.data], [9, 10]);
});

test('rpcUrlFromCluster maps localhost and cluster names', () => {
  assert.equal(rpcUrlFromCluster('localhost'), 'http://127.0.0.1:8899');
  assert.ok(typeof rpcUrlFromCluster('devnet') === 'string');
  assert.equal(rpcUrlFromCluster('https://example.invalid'), 'https://example.invalid');
});

test('RpcProvider retries once and fails over endpoints', async () => {
  const calls = [];
  const provider = new RpcProvider(
    { endpoints: ['a', 'b'], maxRetries: 1, baseDelayMs: 0, maxDelayMs: 0, rateLimitDelayMs: 0 },
    {
      createConnection: (endpoint, wsEndpoint) => ({ endpoint, wsEndpoint }),
      sleep: async () => {},
    }
  );

  let attempt = 0;
  const out = await provider.withConnection(async (c) => {
    calls.push(c.endpoint);
    if (attempt++ === 0) throw new Error('boom');
    return 'ok';
  });

  assert.equal(out, 'ok');

  assert.deepEqual(calls, ['a', 'b']);
});

test('RpcProvider passes wsEndpoint aligned with endpoint failover', async () => {
  const calls = [];
  const provider = new RpcProvider(
    { endpoints: ['a', 'b'], wsEndpoints: ['wa', 'wb'], maxRetries: 1, baseDelayMs: 0, maxDelayMs: 0, rateLimitDelayMs: 0 },
    {
      createConnection: (endpoint, wsEndpoint) => ({ endpoint, wsEndpoint }),
      sleep: async () => {},
    }
  );

  let attempt = 0;
  const out = await provider.withConnection(async (c) => {
    calls.push([c.endpoint, c.wsEndpoint]);
    if (attempt++ === 0) throw new Error('boom');
    return 'ok';
  });

  assert.equal(out, 'ok');
  assert.deepEqual(calls, [
    ['a', 'wa'],
    ['b', 'wb'],
  ]);
});

test('RpcProvider applies rate-limit delay on 429-ish errors', async () => {
  const delays = [];
  const calls = [];
  const provider = new RpcProvider(
    { endpoints: ['a', 'b'], maxRetries: 1, baseDelayMs: 0, maxDelayMs: 0, rateLimitDelayMs: 123 },
    {
      createConnection: (endpoint, wsEndpoint) => ({ endpoint, wsEndpoint }),
      sleep: async (ms) => {
        delays.push(ms);
      },
    }
  );

  let attempt = 0;
  const out = await provider.withConnection(async (c) => {
    calls.push(c.endpoint);
    if (attempt++ === 0) throw new Error('429 Too Many Requests');
    return 'ok';
  });

  assert.equal(out, 'ok');
  assert.deepEqual(calls, ['a', 'b']);
  assert.deepEqual(delays, [123]);
});

test('RpcProvider throws RpcError after exhausting retries', async () => {
  const provider = new RpcProvider(
    { endpoints: ['a', 'b'], maxRetries: 1, baseDelayMs: 0, maxDelayMs: 0, rateLimitDelayMs: 0 },
    {
      createConnection: (endpoint, wsEndpoint) => ({ endpoint, wsEndpoint }),
      sleep: async () => {},
    }
  );

  await assert.rejects(
    () => provider.withConnection(async () => {
      throw new Error('nope');
    }),
    (e) => e instanceof RpcError
  );
});
