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

test('noirforge codegen generates TS bindings files (index.ts, node.ts, README.md)', async () => {
  const repoRoot = path.resolve(__dirname, '../../../../');

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'noirforge-it-codegen-'));
  const artifactDir = path.join(tmp, 'artifact');
  const outDir = path.join(tmp, 'out');
  const outDirWithIdl = path.join(tmp, 'out_with_idl');
  const artifactName = `it_codegen_${Date.now()}`;

  try {
    await fs.mkdir(artifactDir, { recursive: true });

    const manifest = {
      schema_version: 1,
      name: artifactName,
      created_at: new Date().toISOString(),
      circuit_dir: null,
      proving_system: 'groth16',
      outputs: {
        verify_onchain_program_id: '11111111111111111111111111111111',
      },
      outputs_rel: {
        proof: 'p.proof',
        public_witness: 'w.pw',
      },
    };

    await fs.writeFile(path.join(artifactDir, 'noirforge.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

    const r = runNoirforge(repoRoot, ['codegen', '--artifact-name', artifactName, '--out-dir', artifactDir, '--out', outDir]);
    assert.equal(r.status, 0, r.stderr || r.stdout);

    assert.match(r.stdout, /OK\n/);
    assert.match(r.stdout, /out_dir=/);

    const indexTs = await fs.readFile(path.join(outDir, 'index.ts'), 'utf8');
    const nodeTs = await fs.readFile(path.join(outDir, 'node.ts'), 'utf8');
    const readme = await fs.readFile(path.join(outDir, 'README.md'), 'utf8');

    const hasIdlDefault = await fs
      .access(path.join(outDir, 'idl.json'))
      .then(() => true)
      .catch(() => false);
    assert.equal(hasIdlDefault, false, 'idl.json should only be generated when --anchor-idl is set');

    assert.match(indexTs, /DEFAULT_PROGRAM_ID/);
    assert.ok(!indexTs.includes('node:fs/promises'), 'index.ts should be browser-safe (no node:fs imports)');

    assert.ok(nodeTs.includes('node:fs/promises'), 'node.ts should import node:fs/promises');

    assert.ok(readme.includes('buffer'), 'README should mention installing buffer dependency');

    const r2 = runNoirforge(repoRoot, [
      'codegen',
      '--artifact-name',
      artifactName,
      '--out-dir',
      artifactDir,
      '--out',
      outDirWithIdl,
      '--anchor-idl',
    ]);
    assert.equal(r2.status, 0, r2.stderr || r2.stdout);

    const idlTxt = await fs.readFile(path.join(outDirWithIdl, 'idl.json'), 'utf8');
    const idl = JSON.parse(idlTxt);
    assert.ok(idl && typeof idl === 'object');
    assert.equal(idl.instructions && Array.isArray(idl.instructions), true);
    assert.equal(idl.instructions[0] && idl.instructions[0].name, 'verify');
    assert.equal(idl.metadata && idl.metadata.noirforge && idl.metadata.noirforge.program_id, '11111111111111111111111111111111');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
