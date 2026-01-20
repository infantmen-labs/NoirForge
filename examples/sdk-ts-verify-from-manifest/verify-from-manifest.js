const os = require('node:os');
const path = require('node:path');

const { Connection } = require('@solana/web3.js');

const {
  loadKeypairFromFile,
  loadManifest,
  submitVerifyFromManifest,
} = require('@noirforge/sdk');

function fail(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
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
    if (val == null || val.startsWith('--')) fail(`Missing value for --${key}`);
    out[key] = val;
    i++;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const manifestPath = args.manifest;
  if (!manifestPath) fail('Missing --manifest <path>');

  const artifactDir = args['artifact-dir'] || path.dirname(manifestPath);
  const rpc = args.rpc || 'https://api.devnet.solana.com';
  const payerPath = args.payer || path.join(os.homedir(), '.config', 'solana', 'id.json');
  const computeUnitLimit = args['cu-limit'] ? Number(args['cu-limit']) : undefined;

  const manifest = await loadManifest(manifestPath);
  const payer = await loadKeypairFromFile(payerPath);
  const connection = new Connection(rpc, 'confirmed');

  const sig = await submitVerifyFromManifest({
    connection,
    payer,
    artifactDir,
    manifest,
    computeUnitLimit,
  });

  process.stdout.write(`${sig}\n`);
}

main().catch((e) => fail(e && e.stack ? e.stack : String(e)));
