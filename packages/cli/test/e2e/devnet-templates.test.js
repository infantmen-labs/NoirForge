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

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
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
  'noirforge devnet template QA (triggered/nightly): init/test/build/prove/verify-local/deploy/verify-onchain for all templates',
  {
    timeout: 6 * 60 * 60 * 1000,
    skip: process.env.NOIRFORGE_E2E_DEVNET_TEMPLATES !== '1',
  },
  async (t) => {
    const hasNargo = hasCommand('nargo', ['--version']);
    const hasSunspot = hasCommand('sunspot', ['--help']);
    const hasSolana = hasCommand('solana', ['--version']);
    if (!hasNargo || !hasSunspot || !hasSolana) {
      t.skip('requires nargo + sunspot + solana on PATH');
      return;
    }

    const repoRoot = path.resolve(__dirname, '../../../../');
    let templates = await listTemplates(repoRoot);
    const onlyTemplate = process.env.NOIRFORGE_E2E_TEMPLATE;
    if (onlyTemplate && typeof onlyTemplate === 'string' && onlyTemplate.length > 0) {
      templates = templates.filter((x) => x === onlyTemplate);
      if (templates.length === 0) {
        throw new Error(`Unknown template '${onlyTemplate}'. Available: ${await listTemplates(repoRoot)}`);
      }
    }

    const payerPath =
      process.env.NOIRFORGE_E2E_PAYER_PATH || path.join(os.homedir(), '.config', 'solana', 'id.json');
    if (!(await exists(payerPath))) {
      throw new Error(`Missing payer keypair at ${payerPath}`);
    }

    for (const templateName of templates) {
      const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'noirforge-e2e-devnet-templates-'));
      const circuitDir = path.join(tmp, templateName);
      const artifactName = `e2e_${templateName}_devnet_${Date.now()}`;
      const artifactRoot = path.join(repoRoot, 'artifacts', artifactName, 'local');

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

        {
          const r = runNoirforge(repoRoot, ['deploy', '--artifact-name', artifactName, '--cluster', 'devnet']);
          assert.equal(r.status, 0, r.stderr || r.stdout);
        }

        {
          const r = runNoirforge(repoRoot, [
            'verify-onchain',
            '--artifact-name',
            artifactName,
            '--cluster',
            'devnet',
            '--payer',
            payerPath,
          ]);
          assert.equal(r.status, 0, r.stderr || r.stdout);
        }

        const manifestPath = path.join(artifactRoot, 'noirforge.json');
        const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

        assert.equal(manifest.name, artifactName);
        assert.ok(manifest.outputs);

        assert.equal(manifest.outputs.deployed_cluster, 'devnet');
        assert.ok(typeof manifest.outputs.deployed_program_id === 'string');
        assert.ok(typeof manifest.outputs.deployed_program_deploy_signature === 'string');

        assert.equal(manifest.outputs.verify_onchain_cluster, 'devnet');
        assert.ok(typeof manifest.outputs.verify_onchain_program_id === 'string');
        assert.ok(typeof manifest.outputs.verify_onchain_signature === 'string');

        process.stdout.write(
          [
            `template=${templateName}`,
            `deployed_program_id=${manifest.outputs.deployed_program_id}`,
            `deployed_program_deploy_signature=${manifest.outputs.deployed_program_deploy_signature}`,
            `verify_onchain_program_id=${manifest.outputs.verify_onchain_program_id}`,
            `verify_onchain_signature=${manifest.outputs.verify_onchain_signature}`,
          ].join('\n') + '\n'
        );
      } finally {
        await fs.rm(tmp, { recursive: true, force: true });
        await fs.rm(path.join(repoRoot, 'artifacts', artifactName), { recursive: true, force: true });
      }

      assert.ok(true, `template devnet pipeline succeeded: ${templateName}`);
    }
  }
);
