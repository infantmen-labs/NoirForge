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

async function listTemplates(repoRoot) {
  const templatesDir = path.join(repoRoot, 'templates');
  const entries = await fs.readdir(templatesDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort();
}

test(
  'noirforge template QA (triggered): init/test/build/prove/verify-local for all templates',
  {
    timeout: 60 * 60 * 1000,
    skip: process.env.NOIRFORGE_TEMPLATE_QA !== '1',
  },
  async (t) => {
    const hasNargo = hasCommand('nargo', ['--version']);
    const hasSunspot = hasCommand('sunspot', ['--help']);
    if (!hasNargo || !hasSunspot) {
      t.skip('requires nargo + sunspot on PATH');
      return;
    }

    const repoRoot = path.resolve(__dirname, '../../../../');
    const templates = await listTemplates(repoRoot);

    for (const templateName of templates) {
      const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'noirforge-template-qa-'));
      const circuitDir = path.join(tmp, templateName);
      const artifactName = `it_${templateName}_${Date.now()}`;
      const artifactDir = path.join(repoRoot, 'artifacts', artifactName, 'local');

      try {
        {
          const r = runNoirforge(repoRoot, ['init', templateName, circuitDir]);
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
      } finally {
        await fs.rm(tmp, { recursive: true, force: true });
        await fs.rm(path.join(repoRoot, 'artifacts', artifactName), { recursive: true, force: true });
      }

      assert.ok(true, `template pipeline succeeded: ${templateName}`);
    }
  }
);
