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

function hasCommand(cmd, args) {
  const res = spawnSync(cmd, args, {
    stdio: ['ignore', 'ignore', 'ignore'],
  });
  return !res.error && res.status === 0;
}

test(
  'noirforge pipeline: init -> test -> build -> prove -> verify-local (sum_a_b)',
  { timeout: 15 * 60 * 1000 },
  async (t) => {
    const hasNargo = hasCommand('nargo', ['--version']);
    const hasSunspot = hasCommand('sunspot', ['--help']);
    if (!hasNargo || !hasSunspot) {
      t.skip('requires nargo + sunspot on PATH');
      return;
    }

    const repoRoot = path.resolve(__dirname, '../../../../');

    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'noirforge-it-'));
    const circuitDir = path.join(tmp, 'sum_a_b');
    const artifactName = `it_sum_a_b_${Date.now()}`;
    const artifactDir = path.join(repoRoot, 'artifacts', artifactName, 'local');

    try {
      {
        const r = runNoirforge(repoRoot, ['init', 'sum_a_b', circuitDir]);
        assert.equal(r.status, 0, r.stderr || r.stdout);
      }

      {
        const r = runNoirforge(repoRoot, ['test', '--circuit-dir', circuitDir]);
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
        const r = runNoirforge(repoRoot, ['rerun-prove', '--artifact-name', artifactName]);
        assert.equal(r.status, 0, r.stderr || r.stdout);
      }

      {
        const r = runNoirforge(repoRoot, ['verify-local', '--artifact-name', artifactName]);
        assert.equal(r.status, 0, r.stderr || r.stdout);
      }

      const manifestPath = path.join(artifactDir, 'noirforge.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

      assert.equal(manifest.schema_version, 1);
      assert.equal(manifest.name, artifactName);
      assert.ok(manifest.outputs);
      assert.ok(manifest.outputs_rel);

      assert.ok(typeof manifest.outputs.acir_json === 'string' && path.isAbsolute(manifest.outputs.acir_json));
      assert.ok(typeof manifest.outputs_rel.acir_json === 'string' && !path.isAbsolute(manifest.outputs_rel.acir_json));

      assert.ok(typeof manifest.outputs.proof === 'string' && path.isAbsolute(manifest.outputs.proof));
      assert.ok(typeof manifest.outputs_rel.proof === 'string' && !path.isAbsolute(manifest.outputs_rel.proof));

      assert.ok(typeof manifest.outputs.public_witness === 'string' && path.isAbsolute(manifest.outputs.public_witness));
      assert.ok(
        typeof manifest.outputs_rel.public_witness === 'string' && !path.isAbsolute(manifest.outputs_rel.public_witness)
      );

      if (manifest.outputs.prover_toml) {
        assert.ok(typeof manifest.outputs.prover_toml === 'string' && path.isAbsolute(manifest.outputs.prover_toml));
        assert.ok(typeof manifest.outputs_rel.prover_toml === 'string' && !path.isAbsolute(manifest.outputs_rel.prover_toml));
      }
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
      await fs.rm(path.join(repoRoot, 'artifacts', artifactName), { recursive: true, force: true });
    }
  }
);

test(
  'noirforge pipeline: relative-paths-only manifest outputs (sum_a_b)',
  { timeout: 15 * 60 * 1000 },
  async (t) => {
    const hasNargo = hasCommand('nargo', ['--version']);
    const hasSunspot = hasCommand('sunspot', ['--help']);
    if (!hasNargo || !hasSunspot) {
      t.skip('requires nargo + sunspot on PATH');
      return;
    }

    const repoRoot = path.resolve(__dirname, '../../../../');

    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'noirforge-it-rel-'));
    const circuitDir = path.join(tmp, 'sum_a_b');
    const artifactName = `it_sum_a_b_rel_${Date.now()}`;
    const artifactDir = path.join(repoRoot, 'artifacts', artifactName, 'local');

    try {
      {
        const r = runNoirforge(repoRoot, ['init', 'sum_a_b', circuitDir]);
        assert.equal(r.status, 0, r.stderr || r.stdout);
      }

      {
        const r = runNoirforge(repoRoot, ['build', '--circuit-dir', circuitDir, '--artifact-name', artifactName, '--relative-paths-only']);
        assert.equal(r.status, 0, r.stderr || r.stdout);
      }

      {
        const r = runNoirforge(repoRoot, ['prove', '--circuit-dir', circuitDir, '--artifact-name', artifactName, '--relative-paths-only']);
        assert.equal(r.status, 0, r.stderr || r.stdout);
      }

      {
        const r = runNoirforge(repoRoot, ['verify-local', '--artifact-name', artifactName]);
        assert.equal(r.status, 0, r.stderr || r.stdout);
      }

      const manifestPath = path.join(artifactDir, 'noirforge.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

      assert.ok(typeof manifest.outputs.acir_json === 'string' && !path.isAbsolute(manifest.outputs.acir_json));
      assert.ok(typeof manifest.outputs.ccs === 'string' && !path.isAbsolute(manifest.outputs.ccs));
      assert.ok(typeof manifest.outputs.pk === 'string' && !path.isAbsolute(manifest.outputs.pk));
      assert.ok(typeof manifest.outputs.vk === 'string' && !path.isAbsolute(manifest.outputs.vk));

      assert.ok(typeof manifest.outputs.proof === 'string' && !path.isAbsolute(manifest.outputs.proof));
      assert.ok(typeof manifest.outputs.public_witness === 'string' && !path.isAbsolute(manifest.outputs.public_witness));

      assert.ok(typeof manifest.outputs_rel.acir_json === 'string' && !path.isAbsolute(manifest.outputs_rel.acir_json));
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
      await fs.rm(path.join(repoRoot, 'artifacts', artifactName), { recursive: true, force: true });
    }
  }
);
