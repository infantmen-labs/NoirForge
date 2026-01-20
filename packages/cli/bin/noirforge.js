#!/usr/bin/env node

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const MANIFEST_SCHEMA_VERSION = 1;

function envTruthy(v) {
  return v === true || v === 'true' || v === '1';
}

let obsLogEnabled = envTruthy(process.env.NOIRFORGE_OBS_LOG);
let obsEventsPath = process.env.NOIRFORGE_OBS_EVENTS_PATH || null;
let obsEventsDirReady = false;
let obsState = null;

function obsEmit(obj) {
  if (!obsLogEnabled && !obsEventsPath) return;
  const line = JSON.stringify(obj);

  if (obsLogEnabled) {
    process.stderr.write(line + '\n');
  }

  if (obsEventsPath) {
    try {
      if (!obsEventsDirReady) {
        fs.mkdirSync(path.dirname(obsEventsPath), { recursive: true });
        obsEventsDirReady = true;
      }
      fs.appendFileSync(obsEventsPath, line + '\n');
    } catch {
    }
  }
}

function obsBegin(cmd) {
  obsState = { cmd, startMs: Date.now(), ended: false };
  obsEmit({ kind: 'cli_cmd_start', at: new Date(obsState.startMs).toISOString(), cmd });
}

function obsEnd(ok, extra) {
  if (!obsState || obsState.ended) return;
  obsState.ended = true;
  const endMs = Date.now();
  const base = {
    kind: 'cli_cmd_end',
    at: new Date(endMs).toISOString(),
    cmd: obsState.cmd,
    ok: Boolean(ok),
    duration_ms: endMs - obsState.startMs,
  };
  obsEmit(extra && typeof extra === 'object' ? { ...base, ...extra } : base);
}

function fail(msg) {
  obsEnd(false, { error: msg });
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

async function cmdBench(opts) {
  const repoRoot = await findRepoRoot(process.cwd());
  if (!repoRoot) {
    fail('Could not locate repo root (expected a tool-versions file). Run this from within the noirforge repo.');
  }

  const circuitDir = path.resolve(opts['circuit-dir'] || process.cwd());
  const artifactName = opts['artifact-name'] || path.basename(circuitDir);

  function runSelf(args) {
    const start = process.hrtime.bigint();
    const res = spawnSync(process.execPath, [__filename, ...args], {
      stdio: 'inherit',
      env: process.env,
      cwd: repoRoot,
    });
    const end = process.hrtime.bigint();
    if (res.error) {
      fail(`Failed to run noirforge subcommand: ${res.error.message}`);
    }
    if (typeof res.status === 'number' && res.status !== 0) {
      process.exit(res.status);
    }
    return Number(end - start) / 1e6;
  }

  const common = ['--circuit-dir', circuitDir, '--artifact-name', artifactName];
  if (opts['out-dir']) common.push('--out-dir', opts['out-dir']);

  const cluster = opts['cluster'] || null;
  const allowMainnetArgs = isTruthy(opts['allow-mainnet']) ? ['--allow-mainnet'] : [];
  const cuLimitArgs = opts['cu-limit'] ? ['--cu-limit', String(opts['cu-limit'])] : [];
  const payerArgs = opts['payer'] ? ['--payer', opts['payer']] : [];
  const rpcArgs = [];
  if (opts['rpc-url']) rpcArgs.push('--rpc-url', opts['rpc-url']);
  if (opts['rpc-endpoints']) rpcArgs.push('--rpc-endpoints', opts['rpc-endpoints']);
  if (opts['rpc-provider']) rpcArgs.push('--rpc-provider', opts['rpc-provider']);
  if (opts['ws-url']) rpcArgs.push('--ws-url', opts['ws-url']);
  if (opts['ws-endpoints']) rpcArgs.push('--ws-endpoints', opts['ws-endpoints']);

  const buildMs = runSelf(['build', ...common]);
  const proveMs = runSelf(['prove', ...common]);
  const verifyLocalMs = runSelf(['verify-local', '--artifact-name', artifactName, ...(opts['out-dir'] ? ['--out-dir', opts['out-dir']] : [])]);

  let deployMs = null;
  let verifyOnchainMs = null;
  let txStatsMs = null;
  if (cluster) {
    deployMs = runSelf([
      'deploy',
      '--artifact-name',
      artifactName,
      ...(opts['out-dir'] ? ['--out-dir', opts['out-dir']] : []),
      '--cluster',
      cluster,
      ...allowMainnetArgs,
    ]);
    verifyOnchainMs = runSelf([
      'verify-onchain',
      '--artifact-name',
      artifactName,
      ...(opts['out-dir'] ? ['--out-dir', opts['out-dir']] : []),
      '--cluster',
      cluster,
      ...allowMainnetArgs,
      ...cuLimitArgs,
      ...payerArgs,
      ...rpcArgs,
    ]);
    txStatsMs = runSelf([
      'tx-stats',
      '--artifact-name',
      artifactName,
      ...(opts['out-dir'] ? ['--out-dir', opts['out-dir']] : []),
      '--cluster',
      cluster,
      ...rpcArgs,
    ]);
  }

  process.stdout.write('OK\n');
  process.stdout.write(`artifact_name=${artifactName}\n`);
  process.stdout.write(`build_ms=${buildMs.toFixed(2)}\n`);
  process.stdout.write(`prove_ms=${proveMs.toFixed(2)}\n`);
  process.stdout.write(`verify_local_ms=${verifyLocalMs.toFixed(2)}\n`);
  if (cluster) {
    process.stdout.write(`cluster=${cluster}\n`);
    process.stdout.write(`deploy_ms=${deployMs.toFixed(2)}\n`);
    process.stdout.write(`verify_onchain_ms=${verifyOnchainMs.toFixed(2)}\n`);
    process.stdout.write(`tx_stats_ms=${txStatsMs.toFixed(2)}\n`);
  }
}

async function sha256File(filePath) {
  return await new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function readJsonIfExists(p) {
  try {
    const txt = await fsp.readFile(p, 'utf8');
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

function isTruthy(v) {
  return v === true || v === 'true' || v === '1';
}

function toStoredPath(outDir, absPath, relativeOnly) {
  return relativeOnly ? path.relative(outDir, absPath) : absPath;
}

function resolveStoredPath(outDir, p) {
  if (typeof p !== 'string') return p;
  return path.isAbsolute(p) ? p : path.resolve(outDir, p);
}

function buildOutputsRelMaybe(outDir, outputs, relativeOnly) {
  return relativeOnly ? { ...outputs } : buildOutputsRel(outDir, outputs);
}

async function isSetupCacheValid(existing, circuitDir, outDir) {
  if (!existing || typeof existing !== 'object') return false;
  if (!existing.outputs || typeof existing.outputs !== 'object') return false;
  if (!existing.hashes || typeof existing.hashes !== 'object') return false;

  if (existing.circuit_dir && typeof existing.circuit_dir === 'string') {
    if (path.resolve(existing.circuit_dir) !== path.resolve(circuitDir)) return false;
  }

  const req = [
    ['acir_json', 'acir_json_sha256'],
    ['ccs', 'ccs_sha256'],
    ['pk', 'pk_sha256'],
    ['vk', 'vk_sha256'],
  ];

  for (const [outKey, hashKey] of req) {
    const p = resolveStoredPath(outDir, existing.outputs[outKey]);
    const h = existing.hashes[hashKey];
    if (typeof p !== 'string' || typeof h !== 'string') return false;
    if (!(await fileExists(p))) return false;
    const actual = await sha256File(p);
    if (actual !== h) return false;
  }

  return true;
}

function buildOutputsRel(outDir, outputs) {
  const rel = {};
  for (const [k, v] of Object.entries(outputs || {})) {
    if (typeof v === 'string' && path.isAbsolute(v)) {
      rel[k] = path.relative(outDir, v);
      continue;
    }
    rel[k] = v;
  }
  return rel;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(e) {
  const msg = e && typeof e === 'object' && typeof e.message === 'string' ? e.message : String(e);
  const m = msg.toLowerCase();
  return m.includes('429') || m.includes('too many requests') || m.includes('rate limit') || m.includes('rate-limited');
}

function backoffDelayMs(attempt, baseMs, maxMs) {
  const exp = Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, attempt)));
  const jitter = Math.floor(Math.random() * Math.min(100, exp + 1));
  return Math.min(maxMs, exp + jitter);
}

function buildTxIndexRecord({ signature, cluster, rpcEndpoint, txInfo, now }) {
  const t = typeof now === 'number' ? now : Date.now();
  const meta = txInfo && txInfo.meta ? txInfo.meta : null;
  return {
    kind: 'tx',
    fetched_at: new Date(t).toISOString(),
    signature,
    cluster,
    rpc_endpoint: rpcEndpoint || null,
    slot: txInfo && typeof txInfo.slot === 'number' ? txInfo.slot : null,
    block_time: txInfo && typeof txInfo.blockTime === 'number' ? txInfo.blockTime : null,
    fee_lamports: meta && typeof meta.fee === 'number' ? meta.fee : null,
    compute_units: meta && typeof meta.computeUnitsConsumed === 'number' ? meta.computeUnitsConsumed : null,
    err: meta ? meta.err : null,
  };
}

function heliusEnhancedBaseUrlFromCluster(cluster) {
  const c = String(cluster || '').toLowerCase();
  if (c.includes('devnet')) return 'https://api-devnet.helius-rpc.com';
  return 'https://api-mainnet.helius-rpc.com';
}

async function fetchHeliusEnhancedTransactions({ apiKey, cluster, signatures, fetchFn }) {
  if (!apiKey) throw new Error('Missing Helius API key');
  if (!Array.isArray(signatures) || signatures.length === 0) throw new Error('Missing signatures');
  const baseUrl = heliusEnhancedBaseUrlFromCluster(cluster);
  const url = `${baseUrl}/v0/transactions?api-key=${encodeURIComponent(String(apiKey))}`;
  const f = fetchFn || (typeof fetch === 'function' ? fetch : null);
  if (!f) throw new Error('fetch is not available in this runtime');

  const res = await f(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transactions: signatures }),
  });

  if (!res || !res.ok) {
    const body = res && typeof res.text === 'function' ? await res.text() : '';
    const code = res && typeof res.status === 'number' ? res.status : 'unknown';
    throw new Error(`Helius enhanced tx request failed (${code})${body ? `: ${body}` : ''}`);
  }

  return await res.json();
}

function clusterToRpcUrl(web3, cluster) {
  return cluster === 'localhost' || cluster === 'localnet'
    ? 'http://127.0.0.1:8899'
    : cluster === 'devnet' || cluster === 'testnet' || cluster === 'mainnet-beta'
      ? web3.clusterApiUrl(cluster)
      : cluster;
}

function getRpcEndpoints(web3, cluster, opts) {
  const explicitUrl = opts['rpc-url'] || process.env.NOIRFORGE_RPC_URL || null;
  const explicitEndpoints = opts['rpc-endpoints'] || process.env.NOIRFORGE_RPC_ENDPOINTS || null;

  const providerFromFlagsOrEnv = opts['rpc-provider'] || process.env.NOIRFORGE_RPC_PROVIDER || null;
  const quicknodeUrl = process.env.NOIRFORGE_QUICKNODE_RPC_URL || null;
  const quicknodeEndpoints = process.env.NOIRFORGE_QUICKNODE_RPC_ENDPOINTS || null;
  const heliusUrl = process.env.NOIRFORGE_HELIUS_RPC_URL || null;
  const heliusEndpoints = process.env.NOIRFORGE_HELIUS_RPC_ENDPOINTS || null;

  const endpoints = [];
  if (explicitUrl && typeof explicitUrl === 'string') endpoints.push(explicitUrl);
  if (explicitEndpoints && typeof explicitEndpoints === 'string') {
    endpoints.push(...explicitEndpoints.split(',').map((s) => s.trim()).filter(Boolean));
  }

  if (endpoints.length === 0) {
    let provider = providerFromFlagsOrEnv;
    if (!provider) {
      if ((quicknodeUrl && typeof quicknodeUrl === 'string') || (quicknodeEndpoints && typeof quicknodeEndpoints === 'string')) {
        provider = 'quicknode';
      } else if ((heliusUrl && typeof heliusUrl === 'string') || (heliusEndpoints && typeof heliusEndpoints === 'string')) {
        provider = 'helius';
      } else {
        provider = 'default';
      }
    }

    const p = String(provider).toLowerCase();
    if (p === 'default') {
      endpoints.push(clusterToRpcUrl(web3, cluster));
    } else if (p === 'quicknode') {
      if (quicknodeUrl && typeof quicknodeUrl === 'string') endpoints.push(quicknodeUrl);
      if (quicknodeEndpoints && typeof quicknodeEndpoints === 'string') {
        endpoints.push(...quicknodeEndpoints.split(',').map((s) => s.trim()).filter(Boolean));
      }
      if (endpoints.length === 0) {
        fail(
          'rpc-provider=quicknode selected but no QuickNode endpoints configured. Set NOIRFORGE_QUICKNODE_RPC_URL or NOIRFORGE_QUICKNODE_RPC_ENDPOINTS (or pass --rpc-url/--rpc-endpoints).'
        );
      }
    } else if (p === 'helius') {
      if (heliusUrl && typeof heliusUrl === 'string') endpoints.push(heliusUrl);
      if (heliusEndpoints && typeof heliusEndpoints === 'string') {
        endpoints.push(...heliusEndpoints.split(',').map((s) => s.trim()).filter(Boolean));
      }
      if (endpoints.length === 0) {
        fail(
          'rpc-provider=helius selected but no Helius endpoints configured. Set NOIRFORGE_HELIUS_RPC_URL or NOIRFORGE_HELIUS_RPC_ENDPOINTS (or pass --rpc-url/--rpc-endpoints).'
        );
      }
    } else {
      fail(`Unknown rpc provider: ${provider}`);
    }
  }

  return [...new Set(endpoints)];
}

function getWsEndpoints(opts) {
  const explicitUrl = opts['ws-url'] || process.env.NOIRFORGE_WS_URL || null;
  const explicitEndpoints = opts['ws-endpoints'] || process.env.NOIRFORGE_WS_ENDPOINTS || null;

  const providerFromFlagsOrEnv = opts['rpc-provider'] || process.env.NOIRFORGE_RPC_PROVIDER || null;
  const quicknodeUrl = process.env.NOIRFORGE_QUICKNODE_WS_URL || null;
  const quicknodeEndpoints = process.env.NOIRFORGE_QUICKNODE_WS_ENDPOINTS || null;
  const heliusUrl = process.env.NOIRFORGE_HELIUS_WS_URL || null;
  const heliusEndpoints = process.env.NOIRFORGE_HELIUS_WS_ENDPOINTS || null;

  const endpoints = [];
  if (explicitUrl && typeof explicitUrl === 'string') endpoints.push(explicitUrl);
  if (explicitEndpoints && typeof explicitEndpoints === 'string') {
    endpoints.push(...explicitEndpoints.split(',').map((s) => s.trim()).filter(Boolean));
  }

  if (endpoints.length === 0) {
    let provider = providerFromFlagsOrEnv;
    if (!provider) {
      if ((quicknodeUrl && typeof quicknodeUrl === 'string') || (quicknodeEndpoints && typeof quicknodeEndpoints === 'string')) {
        provider = 'quicknode';
      } else if ((heliusUrl && typeof heliusUrl === 'string') || (heliusEndpoints && typeof heliusEndpoints === 'string')) {
        provider = 'helius';
      } else {
        provider = 'default';
      }
    }

    const p = String(provider).toLowerCase();
    if (p === 'quicknode') {
      if (quicknodeUrl && typeof quicknodeUrl === 'string') endpoints.push(quicknodeUrl);
      if (quicknodeEndpoints && typeof quicknodeEndpoints === 'string') {
        endpoints.push(...quicknodeEndpoints.split(',').map((s) => s.trim()).filter(Boolean));
      }
    } else if (p === 'helius') {
      if (heliusUrl && typeof heliusUrl === 'string') endpoints.push(heliusUrl);
      if (heliusEndpoints && typeof heliusEndpoints === 'string') {
        endpoints.push(...heliusEndpoints.split(',').map((s) => s.trim()).filter(Boolean));
      }
    }
  }

  return endpoints.length > 0 ? [...new Set(endpoints)] : null;
}

async function withRpcConnection(web3, endpoints, fn, opts) {
  const maxRetries = opts && typeof opts.maxRetries === 'number' ? opts.maxRetries : 3;
  const baseDelayMs = opts && typeof opts.baseDelayMs === 'number' ? opts.baseDelayMs : 250;
  const maxDelayMs = opts && typeof opts.maxDelayMs === 'number' ? opts.maxDelayMs : 5_000;
  const rateLimitDelayMs = opts && typeof opts.rateLimitDelayMs === 'number' ? opts.rateLimitDelayMs : 1_000;
  const commitment = (opts && opts.commitment) || 'confirmed';
  const wsEndpoints = opts && Array.isArray(opts.wsEndpoints) ? opts.wsEndpoints : null;

  if (!Array.isArray(endpoints) || endpoints.length === 0) {
    fail('RPC provider requires at least one endpoint');
  }

  let idx = 0;
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const endpoint = endpoints[idx];
    const wsEndpoint =
      wsEndpoints && wsEndpoints.length > 0
        ? wsEndpoints.length === endpoints.length
          ? wsEndpoints[idx]
          : wsEndpoints.length === 1
            ? wsEndpoints[0]
            : null
        : null;
    const connection = wsEndpoint
      ? new web3.Connection(endpoint, { commitment, wsEndpoint })
      : new web3.Connection(endpoint, commitment);
    try {
      return await fn(connection, endpoint);
    } catch (e) {
      lastErr = e;
      if (attempt >= maxRetries) {
        const msg = e && typeof e === 'object' && typeof e.message === 'string' ? e.message : String(e);
        fail(`RPC request failed after ${attempt + 1} attempt(s) (last endpoint: ${endpoint})\n${msg}`);
      }

      const delay = isRateLimitError(e)
        ? Math.max(rateLimitDelayMs, backoffDelayMs(attempt, baseDelayMs, maxDelayMs))
        : backoffDelayMs(attempt, baseDelayMs, maxDelayMs);

      idx = (idx + 1) % endpoints.length;
      if (delay > 0) await sleep(delay);
    }
  }

  fail(`RPC request failed: ${lastErr && lastErr.message ? lastErr.message : String(lastErr)}`);
}

function runCapture(cmd, args, options) {
  const res = spawnSync(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    ...options,
  });
  if (res.error) {
    fail(`Failed to run ${cmd}: ${res.error.message}`);
  }
  if (typeof res.status === 'number' && res.status !== 0) {
    const stderr = (res.stderr || '').trim();
    fail(`Command failed: ${cmd} ${args.join(' ')}${stderr ? `\n${stderr}` : ''}`);
  }
  return (res.stdout || '').trim();
}

function usage() {
  return [
    'NoirForge CLI (minimal)',
    '',
    'Usage:',
    '  noirforge init <template> [dest]',
    '  noirforge bench [--circuit-dir <path>] [--artifact-name <name>] [--out-dir <path>] [--cluster <devnet|mainnet-beta|testnet|localhost|url>] [--allow-mainnet] [--cu-limit <n>] [--payer <keypair.json>] [--rpc-provider <default|quicknode|helius>] [--rpc-url <url>] [--rpc-endpoints <csv>] [--ws-url <url>] [--ws-endpoints <csv>]',
    '  noirforge build [--circuit-dir <path>] [--artifact-name <name>] [--out-dir <path>] [--relative-paths-only]',
    '  noirforge compile [--circuit-dir <path>] [--artifact-name <name>] [--out-dir <path>] [--relative-paths-only]',
    '  noirforge setup [--circuit-dir <path>] [--artifact-name <name>] [--out-dir <path>] [--relative-paths-only]',
    '  noirforge prove [--circuit-dir <path>] [--artifact-name <name>] [--out-dir <path>] [--relative-paths-only] [--witness-file <path>] [--prover-name <name>] [--witness-name <name>]',
    '  noirforge test [--circuit-dir <path>]',
    '  noirforge verify-local [--artifact-name <name>] [--out-dir <path>]',
    '  noirforge rerun-prove --artifact-name <name> [--out-dir <path>]',
    '  noirforge deploy --artifact-name <name> [--out-dir <path>] [--relative-paths-only] [--cluster <devnet|mainnet-beta|testnet|localhost|url>] [--allow-mainnet] [--upgrade-authority <keypair.json>] [--final]',
    '  noirforge verify-onchain --artifact-name <name> [--out-dir <path>] [--cluster <devnet|mainnet-beta|testnet|localhost|url>] [--allow-mainnet] [--cu-limit <n>] [--payer <keypair.json>] [--rpc-provider <default|quicknode|helius>] [--rpc-url <url>] [--rpc-endpoints <csv>] [--ws-url <url>] [--ws-endpoints <csv>]',
    '  noirforge simulate-onchain --artifact-name <name> [--out-dir <path>] [--cluster <devnet|mainnet-beta|testnet|localhost|url>] [--allow-mainnet] [--cu-limit <n>] [--payer <keypair.json>] [--rpc-provider <default|quicknode|helius>] [--rpc-url <url>] [--rpc-endpoints <csv>] [--ws-url <url>] [--ws-endpoints <csv>]',
    '  noirforge tx-stats [--artifact-name <name>] [--out-dir <path>] [--signature <sig>] [--cluster <devnet|mainnet-beta|testnet|localhost|url>] [--rpc-provider <default|quicknode|helius>] [--rpc-url <url>] [--rpc-endpoints <csv>] [--ws-url <url>] [--ws-endpoints <csv>]',
    '  noirforge index-tx [--artifact-name <name>] [--out-dir <path>] [--signature <sig>] [--cluster <devnet|mainnet-beta|testnet|localhost|url>] [--index-path <path>] [--helius-enhanced <0|1>] [--helius-api-key <key>] [--rpc-provider <default|quicknode|helius>] [--rpc-url <url>] [--rpc-endpoints <csv>] [--ws-url <url>] [--ws-endpoints <csv>]',
    '  noirforge doctor',
    '  noirforge help',
    '',
    'Notes:',
    '  - Requires `nargo` and `sunspot` on PATH.',
    '  - `init` copies a template from ./templates into a new directory (run without args to list templates).',
    '  - `build` runs: setup (compile + CCS + pk/vk as needed) -> writes to artifacts directory.',
    '  - `compile` runs: nargo compile -> sunspot compile -> writes to artifacts directory.',
    '  - `setup` runs: sunspot setup (requires a .ccs; will compile if missing) -> writes pk/vk to artifacts directory.',
    '  - `prove` runs: nargo execute (witness) + sunspot prove -> writes .proof/.pw to artifacts directory.',
    '  - `test` runs: nargo test in the circuit directory.',
    '  - `verify-local` runs: sunspot verify using artifacts in the output directory.',
    '  - `rerun-prove` replays nargo execute using the stored Prover.toml and regenerates proof/public witness.',
    '  - `deploy` runs: sunspot deploy (builds a Solana verifier program .so + keypair json in the artifacts directory).',
    '  - `deploy --cluster` additionally runs: solana program deploy (records deployed program id + signature).',
    '  - `verify-onchain` submits a tx with instruction_data=proof||public_witness to the deployed verifier program.',
    '  - `simulate-onchain` simulates the same tx via RPC (no signature recorded).',
    '  - `tx-stats` prints fee/compute/error for a transaction signature.',
    '  - `bench` times local pipeline steps (and optionally deploy/verify on a cluster).',
  ].join('\n');
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') {
      out._.push(...argv.slice(i + 1));
      break;
    }
    if (!a.startsWith('--')) {
      out._.push(a);
      continue;
    }
    const key = a.slice(2);
    const val = argv[i + 1];
    if (val == null || val.startsWith('--')) {
      if (key === 'relative-paths-only' || key === 'final' || key === 'allow-mainnet') {
        out[key] = true;
        continue;
      }
      fail(`Missing value for --${key}`);
    }
    out[key] = val;
    i++;
  }
  return out;
}

function withAugmentedPath(env) {
  const home = os.homedir();
  const prepend = [
    path.join(home, '.nargo', 'bin'),
    path.join(home, '.local', 'bin'),
    path.join(home, '.local', 'go', 'bin'),
  ];
  const current = env.PATH || '';
  const next = `${prepend.join(path.delimiter)}${path.delimiter}${current}`;
  return { ...env, PATH: next };
}

function run(cmd, args, options) {
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    ...options,
  });
  if (res.error) {
    fail(`Failed to run ${cmd}: ${res.error.message}`);
  }
  if (typeof res.status === 'number' && res.status !== 0) {
    process.exit(res.status);
  }
}

function runCaptureForErrors(cmd, args, options) {
  const res = spawnSync(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    ...options,
  });
  if (res.error) {
    fail(`Failed to run ${cmd}: ${res.error.message}`);
  }
  if (typeof res.status === 'number' && res.status !== 0) {
    const stdout = (res.stdout || '').trim();
    const stderr = (res.stderr || '').trim();
    const code = res.status;
    const out = [stderr, stdout].filter(Boolean).join('\n');
    fail(`Command failed: ${cmd} ${args.join(' ')} (exit ${code})${out ? `\n${out}` : ''}`);
  }
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
}

async function fileExists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

async function findRepoRoot(startDir) {
  let cur = path.resolve(startDir);
  for (;;) {
    const candidate = path.join(cur, 'tool-versions');
    if (await fileExists(candidate)) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
}

async function readToolVersions(repoRoot) {
  try {
    const p = path.join(repoRoot, 'tool-versions');
    const txt = await fsp.readFile(p, 'utf8');
    const lines = txt.split(/\r?\n/);
    const out = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const parts = trimmed.split(/\s+/);
      const k = parts.shift();
      const v = parts.join(' ');
      if (k) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

async function newestByMtime(paths) {
  let best = null;
  let bestMtime = -1;
  for (const p of paths) {
    const st = await fsp.stat(p);
    const m = st.mtimeMs;
    if (m > bestMtime) {
      bestMtime = m;
      best = p;
    }
  }
  return best;
}

async function listFilesWithExt(dir, ext) {
  try {
    const entries = await fsp.readdir(dir);
    return entries
      .filter((n) => n.endsWith(ext))
      .map((n) => path.join(dir, n));
  } catch {
    return [];
  }
}

async function listTemplateNames(templatesDir) {
  try {
    const entries = await fsp.readdir(templatesDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

async function copyDirRecursive(srcDir, dstDir) {
  await fsp.mkdir(dstDir, { recursive: true });
  const entries = await fsp.readdir(srcDir, { withFileTypes: true });
  for (const e of entries) {
    const src = path.join(srcDir, e.name);
    const dst = path.join(dstDir, e.name);
    if (e.isDirectory()) {
      await copyDirRecursive(src, dst);
    } else if (e.isSymbolicLink()) {
      const target = await fsp.readlink(src);
      await fsp.symlink(target, dst);
    } else if (e.isFile()) {
      await fsp.copyFile(src, dst);
    }
  }
}

async function cmdInit(opts) {
  const repoRoot = await findRepoRoot(process.cwd());
  if (!repoRoot) {
    fail('Could not locate repo root (expected a tool-versions file). Run this from within the noirforge repo.');
  }

  const templatesDir = path.join(repoRoot, 'templates');
  const templates = await listTemplateNames(templatesDir);
  const templateName = opts._ && opts._.length > 0 ? opts._[0] : null;

  if (!templateName) {
    if (templates.length === 0) {
      process.stdout.write('No templates found in ./templates\n');
      return;
    }
    process.stdout.write(templates.join('\n') + '\n');
    return;
  }

  if (!templates.includes(templateName)) {
    fail(
      `Unknown template: ${templateName}\n\nAvailable templates:\n${templates.length ? templates.join('\n') : '(none)'}`
    );
  }

  const srcDir = path.join(templatesDir, templateName);
  const dstDir = opts._ && opts._.length > 1 ? path.resolve(opts._[1]) : path.resolve(process.cwd(), templateName);

  if (await fileExists(dstDir)) {
    fail(`Destination already exists: ${dstDir}`);
  }

  await copyDirRecursive(srcDir, dstDir);
  process.stdout.write('OK\n');
  process.stdout.write(`template=${templateName}\n`);
  process.stdout.write(`dest=${dstDir}\n`);
}

async function cmdCompile(opts) {
  const circuitDir = path.resolve(opts['circuit-dir'] || process.cwd());
  const artifactName = opts['artifact-name'] || path.basename(circuitDir);

  const repoRoot = (await findRepoRoot(process.cwd())) || (await findRepoRoot(circuitDir));
  if (!repoRoot) {
    fail('Could not locate repo root (expected a tool-versions file). Run this from within the noirforge repo.');
  }

  const outDir = path.resolve(opts['out-dir'] || path.join(repoRoot, 'artifacts', artifactName, 'local'));

  const relativeOnly = isTruthy(opts['relative-paths-only']);

  const env = withAugmentedPath(process.env);

  await fsp.mkdir(outDir, { recursive: true });

  runCaptureForErrors('nargo', ['compile'], { cwd: circuitDir, env });

  const targetDir = path.join(circuitDir, 'target');
  const jsons = await listFilesWithExt(targetDir, '.json');

  if (jsons.length === 0) {
    fail(`No ACIR .json found in ${targetDir} after nargo compile`);
  }

  const acirJson = jsons.length === 1 ? jsons[0] : await newestByMtime(jsons);
  run('sunspot', ['compile', acirJson], { cwd: circuitDir, env });

  const ccsName = `${path.basename(acirJson, '.json')}.ccs`;
  const ccsPath = path.join(targetDir, ccsName);
  if (!(await fileExists(ccsPath))) {
    fail(`Expected CCS output not found: ${ccsPath}`);
  }

  const acirOut = path.join(outDir, path.basename(acirJson));
  const ccsOut = path.join(outDir, path.basename(ccsPath));

  await fsp.copyFile(acirJson, acirOut);
  await fsp.copyFile(ccsPath, ccsOut);

  const toolVersions = await readToolVersions(repoRoot);
  const manifestPath = path.join(outDir, 'noirforge.json');
  const existing = await readJsonIfExists(manifestPath);

  const hashes = {
    ...(existing && existing.hashes ? existing.hashes : {}),
    acir_json_sha256: await sha256File(acirOut),
    ccs_sha256: await sha256File(ccsOut),
  };

  const outputs = {
    ...(existing && existing.outputs ? existing.outputs : {}),
    acir_json: toStoredPath(outDir, acirOut, relativeOnly),
    ccs: toStoredPath(outDir, ccsOut, relativeOnly),
  };

  const manifest = {
    schema_version: (existing && existing.schema_version) || MANIFEST_SCHEMA_VERSION,
    name: artifactName,
    created_at: (existing && existing.created_at) || new Date().toISOString(),
    circuit_dir: circuitDir,
    proving_system: (existing && existing.proving_system) || 'groth16',
    outputs,
    outputs_rel: buildOutputsRelMaybe(outDir, outputs, relativeOnly),
    hashes,
    toolchain: toolVersions,
  };
  await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  process.stdout.write(`OK\n`);
  process.stdout.write(`artifact_dir=${outDir}\n`);
  process.stdout.write(`acir_json=${acirOut}\n`);
  process.stdout.write(`ccs=${ccsOut}\n`);
  process.stdout.write(`manifest=${manifestPath}\n`);
}

async function cmdTxStats(opts) {
  const repoRoot = await findRepoRoot(process.cwd());
  if (!repoRoot) {
    fail('Could not locate repo root (expected a tool-versions file). Run this from within the noirforge repo.');
  }

  const artifactName = opts['artifact-name'] || null;
  const outDir = path.resolve(
    opts['out-dir'] || (artifactName ? path.join(repoRoot, 'artifacts', artifactName, 'local') : process.cwd())
  );

  const manifestPath = path.join(outDir, 'noirforge.json');
  const manifest = await readJsonIfExists(manifestPath);

  const signature =
    opts.signature ||
    (manifest && manifest.outputs
      ? manifest.outputs.verify_onchain_signature ||
        manifest.outputs.deployed_program_deploy_signature ||
        manifest.outputs.verify_onchain_deploy_signature
      : null);

  if (!signature || typeof signature !== 'string') {
    fail('Missing transaction signature. Provide --signature <sig> or run this from an artifact directory containing noirforge.json.');
  }

  const cluster =
    opts['cluster'] ||
    (manifest && manifest.outputs
      ? manifest.outputs.verify_onchain_cluster || manifest.outputs.deployed_cluster || 'devnet'
      : 'devnet');

  let web3;
  try {
    web3 = require('@solana/web3.js');
  } catch {
    fail('Missing dependency: @solana/web3.js. Run: pnpm -C packages/cli add @solana/web3.js');
  }

  const endpoints = getRpcEndpoints(web3, cluster, opts);
  const wsEndpoints = getWsEndpoints(opts);
  const txInfo = await withRpcConnection(
    web3,
    endpoints,
    async (connection) => {
      return await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
    },
    { wsEndpoints: wsEndpoints || undefined }
  );

  if (!txInfo) {
    fail(`Transaction not found: ${signature}`);
  }

  const fee = txInfo.meta ? txInfo.meta.fee : null;
  const computeUnits = txInfo.meta ? txInfo.meta.computeUnitsConsumed : null;
  const err = txInfo.meta ? txInfo.meta.err : null;

  process.stdout.write('OK\n');
  process.stdout.write(`cluster=${cluster}\n`);
  process.stdout.write(`signature=${signature}\n`);
  process.stdout.write(`slot=${txInfo.slot}\n`);
  if (typeof txInfo.blockTime === 'number') process.stdout.write(`block_time=${txInfo.blockTime}\n`);
  if (typeof fee === 'number') process.stdout.write(`fee_lamports=${fee}\n`);
  if (typeof computeUnits === 'number') process.stdout.write(`compute_units=${computeUnits}\n`);
  if (err) process.stdout.write(`err=${JSON.stringify(err)}\n`);
}

async function cmdIndexTx(opts) {
  const repoRoot = await findRepoRoot(process.cwd());
  if (!repoRoot) {
    fail('Could not locate repo root (expected a tool-versions file). Run this from within the noirforge repo.');
  }

  const artifactName = opts['artifact-name'] || null;
  const outDir = path.resolve(
    opts['out-dir'] || (artifactName ? path.join(repoRoot, 'artifacts', artifactName, 'local') : process.cwd())
  );

  const manifestPath = path.join(outDir, 'noirforge.json');
  const manifest = await readJsonIfExists(manifestPath);

  const signature =
    opts.signature ||
    (manifest && manifest.outputs
      ? manifest.outputs.verify_onchain_signature ||
        manifest.outputs.deployed_program_deploy_signature ||
        manifest.outputs.verify_onchain_deploy_signature
      : null);

  if (!signature || typeof signature !== 'string') {
    fail('Missing transaction signature. Provide --signature <sig> or run this from an artifact directory containing noirforge.json.');
  }

  const cluster =
    opts['cluster'] ||
    (manifest && manifest.outputs
      ? manifest.outputs.verify_onchain_cluster || manifest.outputs.deployed_cluster || 'devnet'
      : 'devnet');

  let web3;
  try {
    web3 = require('@solana/web3.js');
  } catch {
    fail('Missing dependency: @solana/web3.js. Run: pnpm -C packages/cli add @solana/web3.js');
  }

  const endpoints = getRpcEndpoints(web3, cluster, opts);
  const wsEndpoints = getWsEndpoints(opts);

  const { txInfo, rpcEndpoint } = await withRpcConnection(
    web3,
    endpoints,
    async (connection, endpoint) => {
      const txInfo = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
      return { txInfo, rpcEndpoint: endpoint };
    },
    { wsEndpoints: wsEndpoints || undefined }
  );

  if (!txInfo) {
    fail(`Transaction not found: ${signature}`);
  }

  const indexPath = path.resolve(opts['index-path'] || path.join(outDir, 'noirforge-index.jsonl'));
  await fsp.mkdir(path.dirname(indexPath), { recursive: true });

  const record = buildTxIndexRecord({ signature, cluster, rpcEndpoint, txInfo });
  await fsp.appendFile(indexPath, JSON.stringify(record) + '\n', 'utf8');

  const heliusEnhanced = envTruthy(opts['helius-enhanced'] || process.env.NOIRFORGE_HELIUS_ENHANCED);
  if (heliusEnhanced) {
    const apiKey = opts['helius-api-key'] || process.env.NOIRFORGE_HELIUS_API_KEY || null;
    if (!apiKey) {
      fail('Helius enhanced indexing enabled but no API key provided. Set NOIRFORGE_HELIUS_API_KEY or pass --helius-api-key <key>.');
    }

    const enhanced = await fetchHeliusEnhancedTransactions({ apiKey, cluster, signatures: [signature] });
    const enhancedRec = {
      kind: 'tx_enhanced',
      fetched_at: new Date().toISOString(),
      provider: 'helius',
      signature,
      cluster,
      data: enhanced,
    };
    await fsp.appendFile(indexPath, JSON.stringify(enhancedRec) + '\n', 'utf8');
  }

  process.stdout.write('OK\n');
  process.stdout.write(`cluster=${cluster}\n`);
  process.stdout.write(`signature=${signature}\n`);
  process.stdout.write(`index_path=${indexPath}\n`);
}

async function cmdRerunProve(opts) {
  const artifactName = opts['artifact-name'];
  if (!artifactName) {
    fail('Missing required flag: --artifact-name');
  }

  const repoRoot = await findRepoRoot(process.cwd());
  if (!repoRoot) {
    fail('Could not locate repo root (expected a tool-versions file). Run this from within the noirforge repo.');
  }

  const outDir = path.resolve(opts['out-dir'] || path.join(repoRoot, 'artifacts', artifactName, 'local'));
  const relativeOnly = isTruthy(opts['relative-paths-only']);
  const env = withAugmentedPath(process.env);

  const manifestPath = path.join(outDir, 'noirforge.json');
  const manifest = await readJsonIfExists(manifestPath);
  if (!manifest || !manifest.outputs) {
    fail(`Manifest not found or invalid: ${manifestPath}`);
  }

  const circuitDir = manifest.circuit_dir;
  if (typeof circuitDir !== 'string' || !(await fileExists(circuitDir))) {
    fail(`Manifest missing circuit_dir or directory not found: ${circuitDir}`);
  }

  const proverTomlPath = resolveStoredPath(outDir, manifest.outputs.prover_toml);
  if (typeof proverTomlPath !== 'string' || !(await fileExists(proverTomlPath))) {
    fail(`Manifest missing prover_toml or file not found: ${proverTomlPath}`);
  }

  const acirJson = resolveStoredPath(outDir, manifest.outputs.acir_json);
  const ccsPath = resolveStoredPath(outDir, manifest.outputs.ccs);
  const pkPath = resolveStoredPath(outDir, manifest.outputs.pk);
  if (typeof acirJson !== 'string' || !(await fileExists(acirJson))) fail(`Missing acir_json output in manifest or file not found: ${acirJson}`);
  if (typeof ccsPath !== 'string' || !(await fileExists(ccsPath))) fail(`Missing ccs output in manifest or file not found: ${ccsPath}`);
  if (typeof pkPath !== 'string' || !(await fileExists(pkPath))) fail(`Missing pk output in manifest or file not found: ${pkPath}`);

  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), `noirforge-rerun-${artifactName}-`));
  const tmpCircuitDir = path.join(tmpDir, 'circuit');

  try {
    await copyDirRecursive(circuitDir, tmpCircuitDir);
    await fsp.copyFile(proverTomlPath, path.join(tmpCircuitDir, 'Prover.toml'));

    runCaptureForErrors('nargo', ['execute'], { cwd: tmpCircuitDir, env });

    const targetDir = path.join(tmpCircuitDir, 'target');
    const witnesses = await listFilesWithExt(targetDir, '.gz');
    if (witnesses.length === 0) {
      fail(`No witness .gz found in ${targetDir} after nargo execute`);
    }
    const witnessFile = witnesses.length === 1 ? witnesses[0] : await newestByMtime(witnesses);

    run('sunspot', ['prove', acirJson, witnessFile, ccsPath, pkPath], { cwd: tmpCircuitDir, env });

    const candidateDirs = Array.from(
      new Set([targetDir, tmpCircuitDir, path.dirname(witnessFile), path.dirname(acirJson)].filter((d) => typeof d === 'string'))
    );
    const proofs = [];
    const pws = [];
    for (const d of candidateDirs) {
      proofs.push(...(await listFilesWithExt(d, '.proof')));
      pws.push(...(await listFilesWithExt(d, '.pw')));
    }
    if (proofs.length === 0) fail('Expected proof output not found after sunspot prove');
    if (pws.length === 0) fail('Expected public witness output not found after sunspot prove');
    const proofPath = proofs.length === 1 ? proofs[0] : await newestByMtime(proofs);
    const pwPath = pws.length === 1 ? pws[0] : await newestByMtime(pws);

    const proofOut = path.join(outDir, path.basename(proofPath));
    const pwOut = path.join(outDir, path.basename(pwPath));
    await fsp.copyFile(proofPath, proofOut);
    await fsp.copyFile(pwPath, pwOut);

    const existing = await readJsonIfExists(manifestPath);
    const outputs = {
      ...(existing && existing.outputs ? existing.outputs : {}),
      proof: proofOut,
      public_witness: pwOut,
    };

    const hashes = {
      ...(existing && existing.hashes ? existing.hashes : {}),
      proof_sha256: await sha256File(proofOut),
      public_witness_sha256: await sha256File(pwOut),
    };

    const nextManifest = {
      ...(existing || {}),
      schema_version: (existing && existing.schema_version) || MANIFEST_SCHEMA_VERSION,
      outputs,
      outputs_rel: buildOutputsRel(outDir, outputs),
      hashes,
    };

    await fsp.writeFile(manifestPath, JSON.stringify(nextManifest, null, 2) + '\n', 'utf8');

    process.stdout.write('OK\n');
    process.stdout.write(`artifact_dir=${outDir}\n`);
    process.stdout.write(`proof=${proofOut}\n`);
    process.stdout.write(`public_witness=${pwOut}\n`);
    process.stdout.write(`manifest=${manifestPath}\n`);
  } finally {
    await fsp.rm(tmpDir, { recursive: true, force: true });
  }
}

async function cmdBuild(opts) {
  await cmdSetup(opts);
}

async function cmdTest(opts) {
  const circuitDir = path.resolve(opts['circuit-dir'] || process.cwd());

  const repoRoot = (await findRepoRoot(process.cwd())) || (await findRepoRoot(circuitDir));
  if (!repoRoot) {
    fail('Could not locate repo root (expected a tool-versions file). Run this from within the noirforge repo.');
  }

  const env = withAugmentedPath(process.env);
  runCaptureForErrors('nargo', ['test'], { cwd: circuitDir, env });
  process.stdout.write('OK\n');
}

async function cmdDoctor() {
  const env = withAugmentedPath(process.env);
  const issues = [];

  function tryCapture(cmd, args) {
    const res = spawnSync(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      env,
    });
    const stdout = (res.stdout || '').trim();
    const stderr = (res.stderr || '').trim();
    if (res.error) {
      return { ok: false, stdout, stderr: res.error.message };
    }
    if (typeof res.status === 'number' && res.status !== 0) {
      return { ok: false, stdout, stderr };
    }
    return { ok: true, stdout, stderr };
  }

  const nargoV = tryCapture('nargo', ['--version']);
  if (!nargoV.ok) issues.push(`nargo not available on PATH (${nargoV.stderr || 'unknown error'})`);

  const sunspotH = tryCapture('sunspot', ['--help']);
  if (!sunspotH.ok) issues.push(`sunspot not available on PATH (${sunspotH.stderr || 'unknown error'})`);

  const goV = tryCapture('go', ['version']);
  if (!goV.ok) {
    issues.push(`go not available on PATH (${goV.stderr || 'unknown error'})`);
  } else {
    const m = goV.stdout.match(/\bgo(\d+)\.(\d+)(?:\.(\d+))?\b/);
    if (!m) {
      issues.push(`Could not parse go version output: ${goV.stdout}`);
    } else {
      const maj = Number(m[1]);
      const min = Number(m[2]);
      if (Number.isFinite(maj) && Number.isFinite(min)) {
        if (maj < 1 || (maj === 1 && min < 24)) {
          issues.push(`Go version must be >= 1.24 (found ${m[0]})`);
        }
      }
    }
  }

  const gnarkDir = env.GNARK_VERIFIER_BIN;
  if (!gnarkDir) {
    issues.push(
      'GNARK_VERIFIER_BIN is not set (required for sunspot deploy). Suggested: $HOME/.local/src/sunspot/gnark-solana/crates/verifier-bin'
    );
  } else if (!(await fileExists(gnarkDir))) {
    issues.push(`GNARK_VERIFIER_BIN directory does not exist: ${gnarkDir}`);
  }

  if (issues.length > 0) {
    process.stdout.write('NOT OK\n');
    for (const i of issues) process.stdout.write(`issue=${i}\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write('OK\n');
}

async function cmdVerifyOnchain(opts) {
  const artifactName = opts['artifact-name'];
  if (!artifactName) {
    fail('Missing required flag: --artifact-name');
  }

  const repoRoot = await findRepoRoot(process.cwd());
  if (!repoRoot) {
    fail('Could not locate repo root (expected a tool-versions file). Run this from within the noirforge repo.');
  }

  const outDir = path.resolve(opts['out-dir'] || path.join(repoRoot, 'artifacts', artifactName, 'local'));
  const relativeOnly = isTruthy(opts['relative-paths-only']);
  const env = withAugmentedPath(process.env);

  const manifestPath = path.join(outDir, 'noirforge.json');
  const manifest = await readJsonIfExists(manifestPath);
  if (!manifest || !manifest.outputs) {
    fail(`Manifest not found or invalid: ${manifestPath}`);
  }

  const proofPath = resolveStoredPath(outDir, manifest.outputs.proof);
  const pwPath = resolveStoredPath(outDir, manifest.outputs.public_witness);
  if (!proofPath || !(await fileExists(proofPath))) {
    fail(`Missing proof output in manifest or file not found: ${proofPath}`);
  }
  if (!pwPath || !(await fileExists(pwPath))) {
    fail(`Missing public witness output in manifest or file not found: ${pwPath}`);
  }

  const cluster = opts['cluster'] || manifest.outputs.deployed_cluster || 'devnet';
  if (String(cluster) === 'mainnet-beta' && !isTruthy(opts['allow-mainnet'])) {
    fail('Refusing to use mainnet-beta without explicit opt-in. Re-run with --allow-mainnet.');
  }
  const deployedProgramId = manifest.outputs.deployed_program_id;
  if (!deployedProgramId) {
    fail(
      `Missing deployed_program_id in manifest (${manifestPath}). Run: noirforge deploy --artifact-name ${artifactName} --cluster devnet`
    );
  }

  let web3;
  try {
    web3 = require('@solana/web3.js');
  } catch {
    fail('Missing dependency: @solana/web3.js. Run: pnpm -C packages/cli add @solana/web3.js');
  }

  const endpoints = getRpcEndpoints(web3, cluster, opts);
  const wsEndpoints = getWsEndpoints(opts);

  const payerPath = path.resolve(opts['payer'] || process.env.SOLANA_KEYPAIR || path.join(os.homedir(), '.config', 'solana', 'id.json'));
  if (!(await fileExists(payerPath))) {
    fail(`Payer keypair not found: ${payerPath}`);
  }

  const payerSecret = JSON.parse(await fsp.readFile(payerPath, 'utf8'));
  const payer = web3.Keypair.fromSecretKey(Uint8Array.from(payerSecret));

  const proofBytes = await fsp.readFile(proofPath);
  const pwBytes = await fsp.readFile(pwPath);
  const data = Buffer.concat([proofBytes, pwBytes]);

  const cuLimitRaw = opts['cu-limit'];
  const cuLimit = cuLimitRaw == null ? 500_000 : Number(cuLimitRaw);
  if (!Number.isFinite(cuLimit) || cuLimit <= 0) {
    fail('Invalid --cu-limit (expected a positive number)');
  }

  const computeIx = web3.ComputeBudgetProgram.setComputeUnitLimit({ units: Math.floor(cuLimit) });
  const verifyIx = new web3.TransactionInstruction({
    programId: new web3.PublicKey(deployedProgramId),
    keys: [],
    data,
  });

  const tx = new web3.Transaction().add(computeIx, verifyIx);

  const signature = await withRpcConnection(
    web3,
    endpoints,
    async (connection) => {
      return await web3.sendAndConfirmTransaction(connection, tx, [payer], {
        commitment: 'confirmed',
      });
    },
    { wsEndpoints: wsEndpoints || undefined }
  );

  const txInfo = await withRpcConnection(
    web3,
    endpoints,
    async (connection) => {
      return await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
    },
    { wsEndpoints: wsEndpoints || undefined }
  );

  if (txInfo && txInfo.meta && txInfo.meta.err) {
    fail(`On-chain verification failed (tx meta err). signature=${signature}`);
  }

  const existing = await readJsonIfExists(manifestPath);
  const outputs = {
    ...(existing && existing.outputs ? existing.outputs : {}),
    verify_onchain_cluster: cluster,
    verify_onchain_program_id: deployedProgramId,
    verify_onchain_signature: signature,
  };

  const nextManifest = {
    ...(existing || {}),
    schema_version: (existing && existing.schema_version) || MANIFEST_SCHEMA_VERSION,
    outputs,
    outputs_rel: buildOutputsRel(outDir, outputs),
  };
  await fsp.writeFile(manifestPath, JSON.stringify(nextManifest, null, 2) + '\n', 'utf8');

  process.stdout.write('OK\n');
  process.stdout.write(`cluster=${cluster}\n`);
  process.stdout.write(`program_id=${deployedProgramId}\n`);
  process.stdout.write(`signature=${signature}\n`);
  process.stdout.write(`manifest=${manifestPath}\n`);
}

async function cmdSimulateOnchain(opts) {
  const artifactName = opts['artifact-name'];
  if (!artifactName) {
    fail('Missing required flag: --artifact-name');
  }

  const repoRoot = await findRepoRoot(process.cwd());
  if (!repoRoot) {
    fail('Could not locate repo root (expected a tool-versions file). Run this from within the noirforge repo.');
  }

  const outDir = path.resolve(opts['out-dir'] || path.join(repoRoot, 'artifacts', artifactName, 'local'));
  const relativeOnly = isTruthy(opts['relative-paths-only']);
  const env = withAugmentedPath(process.env);

  const manifestPath = path.join(outDir, 'noirforge.json');
  const manifest = await readJsonIfExists(manifestPath);
  if (!manifest || !manifest.outputs) {
    fail(`Manifest not found or invalid: ${manifestPath}`);
  }

  const proofPath = resolveStoredPath(outDir, manifest.outputs.proof);
  const pwPath = resolveStoredPath(outDir, manifest.outputs.public_witness);
  if (!proofPath || !(await fileExists(proofPath))) {
    fail(`Missing proof output in manifest or file not found: ${proofPath}`);
  }
  if (!pwPath || !(await fileExists(pwPath))) {
    fail(`Missing public witness output in manifest or file not found: ${pwPath}`);
  }

  const cluster = opts['cluster'] || manifest.outputs.deployed_cluster || 'devnet';
  if (String(cluster) === 'mainnet-beta' && !isTruthy(opts['allow-mainnet'])) {
    fail('Refusing to use mainnet-beta without explicit opt-in. Re-run with --allow-mainnet.');
  }
  const deployedProgramId = manifest.outputs.deployed_program_id;
  if (!deployedProgramId) {
    fail(
      `Missing deployed_program_id in manifest (${manifestPath}). Run: noirforge deploy --artifact-name ${artifactName} --cluster devnet`
    );
  }

  let web3;
  try {
    web3 = require('@solana/web3.js');
  } catch {
    fail('Missing dependency: @solana/web3.js. Run: pnpm -C packages/cli add @solana/web3.js');
  }

  const endpoints = getRpcEndpoints(web3, cluster, opts);
  const wsEndpoints = getWsEndpoints(opts);

  const payerPath = path.resolve(opts['payer'] || process.env.SOLANA_KEYPAIR || path.join(os.homedir(), '.config', 'solana', 'id.json'));
  if (!(await fileExists(payerPath))) {
    fail(`Payer keypair not found: ${payerPath}`);
  }

  const payerSecret = JSON.parse(await fsp.readFile(payerPath, 'utf8'));
  const payer = web3.Keypair.fromSecretKey(Uint8Array.from(payerSecret));

  const proofBytes = await fsp.readFile(proofPath);
  const pwBytes = await fsp.readFile(pwPath);
  const data = Buffer.concat([proofBytes, pwBytes]);

  const cuLimitRaw = opts['cu-limit'];
  const cuLimit = cuLimitRaw == null ? 500_000 : Number(cuLimitRaw);
  if (!Number.isFinite(cuLimit) || cuLimit <= 0) {
    fail('Invalid --cu-limit (expected a positive number)');
  }

  const computeIx = web3.ComputeBudgetProgram.setComputeUnitLimit({ units: Math.floor(cuLimit) });
  const verifyIx = new web3.TransactionInstruction({
    programId: new web3.PublicKey(deployedProgramId),
    keys: [],
    data,
  });

  const tx = new web3.Transaction().add(computeIx, verifyIx);
  tx.feePayer = payer.publicKey;
  const sim = await withRpcConnection(
    web3,
    endpoints,
    async (connection) => {
      const latest = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = latest.blockhash;
      tx.sign(payer);

      try {
        return await connection.simulateTransaction(tx, { sigVerify: false, commitment: 'confirmed' });
      } catch {
        return await connection.simulateTransaction(tx, [payer], 'confirmed');
      }
    },
    { wsEndpoints: wsEndpoints || undefined }
  );

  const value = sim && sim.value ? sim.value : null;
  const logs = value && value.logs ? value.logs : null;
  const err = value ? value.err : null;

  if (Array.isArray(logs)) {
    for (const l of logs) process.stdout.write(`${l}\n`);
  }

  if (err) {
    fail(`On-chain simulation error: ${JSON.stringify(err)}`);
  }

  process.stdout.write('OK\n');
  process.stdout.write(`cluster=${cluster}\n`);
  process.stdout.write(`program_id=${deployedProgramId}\n`);
  process.stdout.write(`manifest=${manifestPath}\n`);
}

async function cmdSetup(opts) {
  const circuitDir = path.resolve(opts['circuit-dir'] || process.cwd());
  const artifactName = opts['artifact-name'] || path.basename(circuitDir);

  const repoRoot = (await findRepoRoot(process.cwd())) || (await findRepoRoot(circuitDir));
  if (!repoRoot) {
    fail('Could not locate repo root (expected a tool-versions file). Run this from within the noirforge repo.');
  }

  const outDir = path.resolve(opts['out-dir'] || path.join(repoRoot, 'artifacts', artifactName, 'local'));
  const relativeOnly = isTruthy(opts['relative-paths-only']);
  const env = withAugmentedPath(process.env);

  await fsp.mkdir(outDir, { recursive: true });

  const manifestPath = path.join(outDir, 'noirforge.json');
  const existing = await readJsonIfExists(manifestPath);
  if (await isSetupCacheValid(existing, circuitDir, outDir)) {
    process.stdout.write('OK\n');
    process.stdout.write(`artifact_dir=${outDir}\n`);
    process.stdout.write(`cache_hit=true\n`);
    process.stdout.write(`acir_json=${existing.outputs.acir_json}\n`);
    process.stdout.write(`ccs=${existing.outputs.ccs}\n`);
    process.stdout.write(`pk=${existing.outputs.pk}\n`);
    process.stdout.write(`vk=${existing.outputs.vk}\n`);
    process.stdout.write(`manifest=${manifestPath}\n`);
    return;
  }

  const targetDir = path.join(circuitDir, 'target');
  if (!(await fileExists(targetDir))) {
    runCaptureForErrors('nargo', ['compile'], { cwd: circuitDir, env });
  }
  if (!(await fileExists(targetDir))) {
    fail(`Circuit target directory does not exist: ${targetDir}`);
  }

  const entries = await fsp.readdir(targetDir);
  const jsons = entries
    .filter((n) => n.endsWith('.json'))
    .map((n) => path.join(targetDir, n));

  if (jsons.length === 0) {
    runCaptureForErrors('nargo', ['compile'], { cwd: circuitDir, env });
  }

  const entries2 = await fsp.readdir(targetDir);
  const jsons2 = entries2
    .filter((n) => n.endsWith('.json'))
    .map((n) => path.join(targetDir, n));

  if (jsons2.length === 0) {
    fail(`No ACIR .json found in ${targetDir} after nargo compile`);
  }

  const acirJson = jsons2.length === 1 ? jsons2[0] : await newestByMtime(jsons2);
  const ccsName = `${path.basename(acirJson, '.json')}.ccs`;
  const ccsPath = path.join(targetDir, ccsName);
  if (!(await fileExists(ccsPath))) {
    run('sunspot', ['compile', acirJson], { cwd: circuitDir, env });
  }
  if (!(await fileExists(ccsPath))) {
    fail(`Expected CCS output not found: ${ccsPath}`);
  }

  run('sunspot', ['setup', ccsPath], { cwd: circuitDir, env });

  const pkName = `${path.basename(ccsPath, '.ccs')}.pk`;
  const vkName = `${path.basename(ccsPath, '.ccs')}.vk`;
  const pkPath = path.join(targetDir, pkName);
  const vkPath = path.join(targetDir, vkName);
  if (!(await fileExists(pkPath))) fail(`Expected proving key output not found: ${pkPath}`);
  if (!(await fileExists(vkPath))) fail(`Expected verifying key output not found: ${vkPath}`);

  const acirOut = path.join(outDir, path.basename(acirJson));
  const ccsOut = path.join(outDir, path.basename(ccsPath));
  const pkOut = path.join(outDir, path.basename(pkPath));
  const vkOut = path.join(outDir, path.basename(vkPath));

  await fsp.copyFile(acirJson, acirOut);
  await fsp.copyFile(ccsPath, ccsOut);
  await fsp.copyFile(pkPath, pkOut);
  await fsp.copyFile(vkPath, vkOut);

  const toolVersions = await readToolVersions(repoRoot);
  const existing2 = await readJsonIfExists(manifestPath);

  const hashes = {
    ...(existing2 && existing2.hashes ? existing2.hashes : {}),
    acir_json_sha256: await sha256File(acirOut),
    ccs_sha256: await sha256File(ccsOut),
    pk_sha256: await sha256File(pkOut),
    vk_sha256: await sha256File(vkOut),
  };

  const outputs = {
    ...(existing2 && existing2.outputs ? existing2.outputs : {}),
    acir_json: toStoredPath(outDir, acirOut, relativeOnly),
    ccs: toStoredPath(outDir, ccsOut, relativeOnly),
    pk: toStoredPath(outDir, pkOut, relativeOnly),
    vk: toStoredPath(outDir, vkOut, relativeOnly),
  };

  const manifest = {
    schema_version: (existing2 && existing2.schema_version) || MANIFEST_SCHEMA_VERSION,
    name: artifactName,
    created_at: (existing2 && existing2.created_at) || new Date().toISOString(),
    circuit_dir: circuitDir,
    proving_system: (existing2 && existing2.proving_system) || 'groth16',
    outputs,
    outputs_rel: buildOutputsRelMaybe(outDir, outputs, relativeOnly),
    hashes,
    toolchain: toolVersions,
  };

  await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  process.stdout.write(`OK\n`);
  process.stdout.write(`artifact_dir=${outDir}\n`);
  process.stdout.write(`acir_json=${acirOut}\n`);
  process.stdout.write(`ccs=${ccsOut}\n`);
  process.stdout.write(`pk=${pkOut}\n`);
  process.stdout.write(`vk=${vkOut}\n`);
  process.stdout.write(`manifest=${manifestPath}\n`);
}

async function cmdProve(opts) {
  const circuitDir = path.resolve(opts['circuit-dir'] || process.cwd());
  const artifactName = opts['artifact-name'] || path.basename(circuitDir);

  const repoRoot = (await findRepoRoot(process.cwd())) || (await findRepoRoot(circuitDir));
  if (!repoRoot) {
    fail('Could not locate repo root (expected a tool-versions file). Run this from within the noirforge repo.');
  }

  const outDir = path.resolve(opts['out-dir'] || path.join(repoRoot, 'artifacts', artifactName, 'local'));
  const relativeOnly = isTruthy(opts['relative-paths-only']);
  const env = withAugmentedPath(process.env);

  await fsp.mkdir(outDir, { recursive: true });

  const proverTomlSrc = path.join(circuitDir, 'Prover.toml');
  const proverTomlOut = path.join(outDir, 'Prover.toml');
  if (await fileExists(proverTomlSrc)) {
    await fsp.copyFile(proverTomlSrc, proverTomlOut);
  }

  const proverTomlSha256 = (await fileExists(proverTomlOut)) ? await sha256File(proverTomlOut) : null;

  const targetDir = path.join(circuitDir, 'target');
  if (!(await fileExists(targetDir))) {
    runCaptureForErrors('nargo', ['compile'], { cwd: circuitDir, env });
  }

  const jsons = await listFilesWithExt(targetDir, '.json');
  if (jsons.length === 0) {
    runCaptureForErrors('nargo', ['compile'], { cwd: circuitDir, env });
  }

  const jsons2 = await listFilesWithExt(targetDir, '.json');
  if (jsons2.length === 0) {
    fail(`No ACIR .json found in ${targetDir} after nargo compile`);
  }

  const acirJson = jsons2.length === 1 ? jsons2[0] : await newestByMtime(jsons2);
  const base = path.basename(acirJson, '.json');
  const ccsPath = path.join(targetDir, `${base}.ccs`);
  const pkPath = path.join(targetDir, `${base}.pk`);
  const vkPath = path.join(targetDir, `${base}.vk`);

  if (!(await fileExists(ccsPath))) {
    run('sunspot', ['compile', acirJson], { cwd: circuitDir, env });
  }
  if (!(await fileExists(ccsPath))) fail(`Expected CCS output not found: ${ccsPath}`);

  if (!(await fileExists(pkPath)) || !(await fileExists(vkPath))) {
    run('sunspot', ['setup', ccsPath], { cwd: circuitDir, env });
  }
  if (!(await fileExists(pkPath))) fail(`Expected proving key output not found: ${pkPath}`);
  if (!(await fileExists(vkPath))) fail(`Expected verifying key output not found: ${vkPath}`);

  let witnessFile = opts['witness-file'] ? path.resolve(opts['witness-file']) : null;
  if (!witnessFile) {
    const proverName = opts['prover-name'];
    const witnessName = opts['witness-name'];
    const execArgs = ['execute'];
    if (proverName) execArgs.push('--prover-name', proverName);
    if (witnessName) execArgs.push(witnessName);
    runCaptureForErrors('nargo', execArgs, { cwd: circuitDir, env });

    const witnesses = await listFilesWithExt(targetDir, '.gz');
    if (witnesses.length === 0) {
      fail(`No witness .gz found in ${targetDir} after nargo execute. Ensure Prover.toml exists or pass --witness-file.`);
    }
    witnessFile = witnesses.length === 1 ? witnesses[0] : await newestByMtime(witnesses);
  }

  if (!(await fileExists(witnessFile))) {
    fail(`Witness file not found: ${witnessFile}`);
  }

  run('sunspot', ['prove', acirJson, witnessFile, ccsPath, pkPath], { cwd: circuitDir, env });

  const proofPath = path.join(targetDir, `${base}.proof`);
  const pwPath = path.join(targetDir, `${base}.pw`);
  if (!(await fileExists(proofPath))) fail(`Expected proof output not found: ${proofPath}`);
  if (!(await fileExists(pwPath))) fail(`Expected public witness output not found: ${pwPath}`);

  const acirOut = path.join(outDir, path.basename(acirJson));
  const ccsOut = path.join(outDir, path.basename(ccsPath));
  const pkOut = path.join(outDir, path.basename(pkPath));
  const vkOut = path.join(outDir, path.basename(vkPath));
  const proofOut = path.join(outDir, path.basename(proofPath));
  const pwOut = path.join(outDir, path.basename(pwPath));

  await fsp.copyFile(acirJson, acirOut);
  await fsp.copyFile(ccsPath, ccsOut);
  await fsp.copyFile(pkPath, pkOut);
  await fsp.copyFile(vkPath, vkOut);
  await fsp.copyFile(proofPath, proofOut);
  await fsp.copyFile(pwPath, pwOut);

  const toolVersions = await readToolVersions(repoRoot);
  const manifestPath = path.join(outDir, 'noirforge.json');
  const existing = await readJsonIfExists(manifestPath);

  const hashes = {
    ...(existing && existing.hashes ? existing.hashes : {}),
    acir_json_sha256: await sha256File(acirOut),
    ccs_sha256: await sha256File(ccsOut),
    pk_sha256: await sha256File(pkOut),
    vk_sha256: await sha256File(vkOut),
    proof_sha256: await sha256File(proofOut),
    public_witness_sha256: await sha256File(pwOut),
    ...(proverTomlSha256 ? { prover_toml_sha256: proverTomlSha256 } : {}),
  };

  const outputs = {
    ...(existing && existing.outputs ? existing.outputs : {}),
    acir_json: toStoredPath(outDir, acirOut, relativeOnly),
    ccs: toStoredPath(outDir, ccsOut, relativeOnly),
    pk: toStoredPath(outDir, pkOut, relativeOnly),
    vk: toStoredPath(outDir, vkOut, relativeOnly),
    proof: toStoredPath(outDir, proofOut, relativeOnly),
    public_witness: toStoredPath(outDir, pwOut, relativeOnly),
    ...((await fileExists(proverTomlOut)) ? { prover_toml: toStoredPath(outDir, proverTomlOut, relativeOnly) } : {}),
  };

  const manifest = {
    schema_version: (existing && existing.schema_version) || MANIFEST_SCHEMA_VERSION,
    name: artifactName,
    created_at: (existing && existing.created_at) || new Date().toISOString(),
    circuit_dir: circuitDir,
    proving_system: (existing && existing.proving_system) || 'groth16',
    outputs,
    outputs_rel: buildOutputsRelMaybe(outDir, outputs, relativeOnly),
    hashes,
    toolchain: toolVersions,
  };

  await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  process.stdout.write(`OK\n`);
  process.stdout.write(`artifact_dir=${outDir}\n`);
  process.stdout.write(`proof=${proofOut}\n`);
  process.stdout.write(`public_witness=${pwOut}\n`);
  process.stdout.write(`manifest=${manifestPath}\n`);
}

async function cmdVerifyLocal(opts) {
  const artifactName = opts['artifact-name'];
  if (!artifactName) {
    fail('Missing required flag: --artifact-name');
  }

  const repoRoot = await findRepoRoot(process.cwd());
  if (!repoRoot) {
    fail('Could not locate repo root (expected a tool-versions file). Run this from within the noirforge repo.');
  }

  const outDir = path.resolve(opts['out-dir'] || path.join(repoRoot, 'artifacts', artifactName, 'local'));
  const env = withAugmentedPath(process.env);

  const manifestPath = path.join(outDir, 'noirforge.json');
  const manifest = await readJsonIfExists(manifestPath);
  if (!manifest || !manifest.outputs) {
    fail(`Manifest not found or invalid: ${manifestPath}`);
  }

  const vk = resolveStoredPath(outDir, manifest.outputs.vk);
  const proof = resolveStoredPath(outDir, manifest.outputs.proof);
  const pw = resolveStoredPath(outDir, manifest.outputs.public_witness);

  if (!vk || !(await fileExists(vk))) fail(`Missing vk output in manifest or file not found: ${vk}`);
  if (!proof || !(await fileExists(proof))) fail(`Missing proof output in manifest or file not found: ${proof}`);
  if (!pw || !(await fileExists(pw))) fail(`Missing public witness output in manifest or file not found: ${pw}`);

  run('sunspot', ['verify', vk, proof, pw], { cwd: outDir, env });

  process.stdout.write('OK\n');
}

async function cmdDeploy(opts) {
  const artifactName = opts['artifact-name'];
  if (!artifactName) {
    fail('Missing required flag: --artifact-name');
  }

  const repoRoot = await findRepoRoot(process.cwd());
  if (!repoRoot) {
    fail('Could not locate repo root (expected a tool-versions file). Run this from within the noirforge repo.');
  }

  const outDir = path.resolve(opts['out-dir'] || path.join(repoRoot, 'artifacts', artifactName, 'local'));
  const relativeOnly = isTruthy(opts['relative-paths-only']);
  const env = withAugmentedPath(process.env);

  if (!env.GNARK_VERIFIER_BIN) {
    fail(
      'GNARK_VERIFIER_BIN is not set. It must point to the verifier-bin crate directory for sunspot deploy to work.\n' +
        'Try: export GNARK_VERIFIER_BIN="$HOME/.local/src/sunspot/gnark-solana/crates/verifier-bin"'
    );
  }

  if (!(await fileExists(env.GNARK_VERIFIER_BIN))) {
    fail(`GNARK_VERIFIER_BIN directory does not exist: ${env.GNARK_VERIFIER_BIN}`);
  }

  const manifestPath = path.join(outDir, 'noirforge.json');
  const manifest = await readJsonIfExists(manifestPath);
  if (!manifest || !manifest.outputs) {
    fail(`Manifest not found or invalid: ${manifestPath}`);
  }

  let vkPath = resolveStoredPath(outDir, manifest.outputs.vk);
  if (!vkPath || !(await fileExists(vkPath))) {
    const vks = await listFilesWithExt(outDir, '.vk');
    if (vks.length === 0) {
      fail(`No .vk found in ${outDir}. Run noirforge setup first.`);
    }
    vkPath = vks.length === 1 ? vks[0] : await newestByMtime(vks);
  }

  run('sunspot', ['deploy', vkPath], { cwd: outDir, env });

  const vkDir = path.dirname(vkPath);
  const base = path.basename(vkPath, '.vk');
  const soPath = path.join(vkDir, `${base}.so`);
  const keypairPath = path.join(vkDir, `${base}-keypair.json`);

  if (!(await fileExists(soPath))) fail(`Expected program .so not found: ${soPath}`);
  if (!(await fileExists(keypairPath))) fail(`Expected program keypair not found: ${keypairPath}`);

  let builtProgramId = null;
  try {
    builtProgramId = runCapture('solana-keygen', ['pubkey', keypairPath], { env });
  } catch {
    builtProgramId = null;
  }

  const cluster = opts['cluster'] || null;
  let deployedProgramId = null;
  let deployedSignature = null;
  let deployedUpgradeAuthority = null;
  if (cluster) {
    if (String(cluster) === 'mainnet-beta' && !isTruthy(opts['allow-mainnet'])) {
      fail('Refusing to deploy to mainnet-beta without explicit opt-in. Re-run with --allow-mainnet.');
    }
    const finalFlag = isTruthy(opts.final);
    const upgradeAuthorityPath = opts['upgrade-authority'] ? path.resolve(opts['upgrade-authority']) : null;

    if (finalFlag && upgradeAuthorityPath) {
      fail('Cannot use both --final and --upgrade-authority at the same time.');
    }

    const deployArgs = ['program', 'deploy', soPath, '--program-id', keypairPath, '--url', cluster, '--output', 'json'];
    if (upgradeAuthorityPath) deployArgs.push('--upgrade-authority', upgradeAuthorityPath);
    if (finalFlag) deployArgs.push('--final');

    const deployOut = runCapture('solana', deployArgs, { env });

    try {
      const parsed = JSON.parse(deployOut);
      if (parsed && typeof parsed === 'object') {
        deployedProgramId = parsed.programId || parsed.program_id || parsed.program || null;
        deployedSignature = parsed.signature || parsed.txSignature || parsed.transactionSignature || null;
      }
    } catch {
      const mProg = deployOut.match(/\bProgram\s+Id:\s*([1-9A-HJ-NP-Za-km-z]{32,44})/);
      const mSig = deployOut.match(/\bSignature:\s*([1-9A-HJ-NP-Za-km-z]{32,128})/);
      deployedProgramId = mProg ? mProg[1] : null;
      deployedSignature = mSig ? mSig[1] : null;
    }

    if (!deployedProgramId) {
      deployedProgramId = builtProgramId;
    }

    if (deployedProgramId) {
      try {
        const showOut = runCapture('solana', ['program', 'show', deployedProgramId, '--url', cluster, '--output', 'json'], { env });
        const parsed = JSON.parse(showOut);
        if (parsed && typeof parsed === 'object') {
          const cand =
            parsed.upgradeAuthority ||
            parsed.upgrade_authority ||
            parsed.authority ||
            parsed.authorityAddress ||
            parsed.authority_address ||
            null;
          if (cand && typeof cand === 'string') deployedUpgradeAuthority = cand;
        }
      } catch {
        deployedUpgradeAuthority = null;
      }
    }
  }

  const toolVersions = await readToolVersions(repoRoot);
  const existing = await readJsonIfExists(manifestPath);

  const programSoSha256 = await sha256File(soPath);
  const programKeypairSha256 = await sha256File(keypairPath);

  const hashes = {
    ...(existing && existing.hashes ? existing.hashes : {}),
    program_so_sha256: programSoSha256,
    program_keypair_sha256: programKeypairSha256,
    built_program_so_sha256: programSoSha256,
    built_program_keypair_sha256: programKeypairSha256,
  };

  const outputs = {
    ...(existing && existing.outputs ? existing.outputs : {}),
    program_so: toStoredPath(outDir, soPath, relativeOnly),
    program_keypair: toStoredPath(outDir, keypairPath, relativeOnly),
    program_id: builtProgramId,
    built_program_so: toStoredPath(outDir, soPath, relativeOnly),
    built_program_keypair: toStoredPath(outDir, keypairPath, relativeOnly),
    built_program_id: builtProgramId,
    ...(cluster
      ? {
          deployed_cluster: cluster,
          deployed_program_id: deployedProgramId,
          deployed_program_deploy_signature: deployedSignature,
          ...(deployedUpgradeAuthority ? { deployed_program_upgrade_authority: deployedUpgradeAuthority } : {}),
        }
      : {}),
  };

  const nextManifest = {
    schema_version: (existing && existing.schema_version) || MANIFEST_SCHEMA_VERSION,
    name: artifactName,
    created_at: (existing && existing.created_at) || new Date().toISOString(),
    circuit_dir: existing && existing.circuit_dir ? existing.circuit_dir : null,
    proving_system: (existing && existing.proving_system) || 'groth16',
    outputs,
    outputs_rel: buildOutputsRelMaybe(outDir, outputs, relativeOnly),
    hashes,
    toolchain: toolVersions,
  };

  await fsp.writeFile(manifestPath, JSON.stringify(nextManifest, null, 2) + '\n', 'utf8');

  process.stdout.write('OK\n');
  process.stdout.write(`artifact_dir=${outDir}\n`);
  process.stdout.write(`program_so=${soPath}\n`);
  process.stdout.write(`program_keypair=${keypairPath}\n`);
  if (builtProgramId) process.stdout.write(`program_id=${builtProgramId}\n`);
  if (builtProgramId) process.stdout.write(`built_program_id=${builtProgramId}\n`);
  if (cluster) process.stdout.write(`deployed_cluster=${cluster}\n`);
  if (deployedProgramId) process.stdout.write(`deployed_program_id=${deployedProgramId}\n`);
  if (deployedSignature) process.stdout.write(`deployed_program_deploy_signature=${deployedSignature}\n`);
  if (deployedUpgradeAuthority) process.stdout.write(`deployed_program_upgrade_authority=${deployedUpgradeAuthority}\n`);
  process.stdout.write(`manifest=${manifestPath}\n`);
}

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    process.stdout.write(usage() + '\n');
    return;
  }

  const opts = parseArgs(argv.slice(1));

  if (opts['obs-log'] != null) {
    obsLogEnabled = envTruthy(opts['obs-log']);
  }
  if (opts['obs-events-path']) {
    obsEventsPath = String(opts['obs-events-path']);
    obsEventsDirReady = false;
  }

  obsBegin(cmd);

  try {
    if (cmd === 'init') {
      await cmdInit(opts);
      obsEnd(true);
      return;
    }

    if (cmd === 'build') {
      await cmdBuild(opts);
      obsEnd(true);
      return;
    }

    if (cmd === 'compile') {
      await cmdCompile(opts);
      obsEnd(true);
      return;
    }

    if (cmd === 'setup') {
      await cmdSetup(opts);
      obsEnd(true);
      return;
    }

    if (cmd === 'test') {
      await cmdTest(opts);
      obsEnd(true);
      return;
    }

    if (cmd === 'prove') {
      await cmdProve(opts);
      obsEnd(true);
      return;
    }

    if (cmd === 'verify-local') {
      await cmdVerifyLocal(opts);
      obsEnd(true);
      return;
    }

    if (cmd === 'bench') {
      await cmdBench(opts);
      obsEnd(true);
      return;
    }

    if (cmd === 'rerun-prove') {
      await cmdRerunProve(opts);
      obsEnd(true);
      return;
    }

    if (cmd === 'verify-onchain') {
      await cmdVerifyOnchain(opts);
      obsEnd(true);
      return;
    }

    if (cmd === 'simulate-onchain') {
      await cmdSimulateOnchain(opts);
      obsEnd(true);
      return;
    }

    if (cmd === 'tx-stats') {
      await cmdTxStats(opts);
      obsEnd(true);
      return;
    }

    if (cmd === 'index-tx') {
      await cmdIndexTx(opts);
      obsEnd(true);
      return;
    }

    if (cmd === 'deploy') {
      await cmdDeploy(opts);
      obsEnd(true);
      return;
    }

    if (cmd === 'doctor') {
      await cmdDoctor();
      obsEnd(true);
      return;
    }

    fail(`Unknown command: ${cmd}\n\n${usage()}`);
  } catch (e) {
    const msg = e && typeof e === 'object' && typeof e.message === 'string' ? e.message : String(e);
    obsEnd(false, { error: msg });
    throw e;
  }
}

if (require.main === module) {
  main().catch((e) => {
    fail(e && e.stack ? e.stack : String(e));
  });
}

module.exports = {
  buildOutputsRel,
  buildTxIndexRecord,
  clusterToRpcUrl,
  fetchHeliusEnhancedTransactions,
  heliusEnhancedBaseUrlFromCluster,
  getRpcEndpoints,
  getWsEndpoints,
  parseArgs,
  findRepoRoot,
  readToolVersions,
};
