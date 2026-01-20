const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

function runNoirforge(repoRoot, args) {
  const cliPath = path.join(repoRoot, 'packages', 'cli', 'bin', 'noirforge.js');
  const res = spawnSync('node', [cliPath, ...args], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });

  if (res.error) {
    throw res.error;
  }
  return {
    status: res.status,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
  };
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

test(
  'noirforge mainnet e2e (triggered): build/prove/deploy/verify-onchain (sum_a_b)',
  {
    timeout: 35 * 60 * 1000,
    skip: process.env.NOIRFORGE_E2E_MAINNET !== '1',
  },
  async () => {
    const repoRoot = path.resolve(__dirname, '../../../../');
    const payerPath = path.join(os.homedir(), '.config', 'solana', 'id.json');
    if (!(await exists(payerPath))) {
      throw new Error(`Missing payer keypair at ${payerPath}`);
    }

    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'noirforge-e2e-mainnet-'));
    const circuitDir = path.join(tmp, 'sum_a_b');
    const artifactName = `e2e_sum_a_b_mainnet_${Date.now()}`;
    const artifactRoot = path.join(repoRoot, 'artifacts', artifactName, 'local');

    try {
      {
        const r = runNoirforge(repoRoot, ['init', 'sum_a_b', circuitDir]);
        assert.equal(r.status, 0, r.stderr || r.stdout);
      }

      {
        const r = runNoirforge(repoRoot, ['build', '--circuit-dir', circuitDir, '--artifact-name', artifactName]);
        assert.equal(r.status, 0, r.stderr || r.stdout);
      }

      {
        const r = runNoirforge(repoRoot, ['prove', '--circuit-dir', circuitDir, '--artifact-name', artifactName]);
        assert.equal(r.status, 0, r.stderr || r.stdout);
      }

      {
        const r = runNoirforge(repoRoot, ['verify-local', '--artifact-name', artifactName]);
        assert.equal(r.status, 0, r.stderr || r.stdout);
      }

      {
        const r = runNoirforge(repoRoot, [
          'deploy',
          '--artifact-name',
          artifactName,
          '--cluster',
          'mainnet-beta',
          '--allow-mainnet',
        ]);
        assert.equal(r.status, 0, r.stderr || r.stdout);
      }

      {
        const r = runNoirforge(repoRoot, [
          'verify-onchain',
          '--artifact-name',
          artifactName,
          '--cluster',
          'mainnet-beta',
          '--allow-mainnet',
          '--payer',
          payerPath,
        ]);
        assert.equal(r.status, 0, r.stderr || r.stdout);
      }

      const manifestPath = path.join(artifactRoot, 'noirforge.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

      assert.equal(manifest.name, artifactName);
      assert.ok(manifest.outputs);

      assert.equal(manifest.outputs.deployed_cluster, 'mainnet-beta');
      assert.ok(typeof manifest.outputs.deployed_program_id === 'string');
      assert.ok(typeof manifest.outputs.deployed_program_deploy_signature === 'string');

      assert.equal(manifest.outputs.verify_onchain_cluster, 'mainnet-beta');
      assert.ok(typeof manifest.outputs.verify_onchain_program_id === 'string');
      assert.ok(typeof manifest.outputs.verify_onchain_signature === 'string');
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
      await fs.rm(path.join(repoRoot, 'artifacts', artifactName), { recursive: true, force: true });
    }
  }
);
