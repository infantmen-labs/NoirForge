#!/usr/bin/env node

const { createWebhookServer } = require('../src/index.js');

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
    if (val == null || val.startsWith('--')) {
      fail(`Missing value for --${key}`);
    }
    out[key] = val;
    i++;
  }
  return out;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const provider = (opts.provider || process.env.NOIRFORGE_WEBHOOK_PROVIDER || 'quicknode').toLowerCase();
  const port = Number(opts.port || process.env.NOIRFORGE_WEBHOOK_PORT || 8787);
  const host = opts.host || process.env.NOIRFORGE_WEBHOOK_HOST || '127.0.0.1';
  const path = opts.path || process.env.NOIRFORGE_WEBHOOK_PATH || '/webhook';

  const qnSecret = process.env.NOIRFORGE_QN_WEBHOOK_SECRET || null;
  const heliusAuth = process.env.NOIRFORGE_HELIUS_WEBHOOK_AUTHORIZATION || null;

  const eventsPath = process.env.NOIRFORGE_WEBHOOK_EVENTS_PATH || null;
  const dlqPath = process.env.NOIRFORGE_WEBHOOK_DLQ_PATH || null;

  const srv = createWebhookServer({
    provider,
    port,
    host,
    path,
    quicknodeSecret: qnSecret,
    heliusAuthorization: heliusAuth,
    eventsPath,
    dlqPath,
  });

  await srv.listen();
  process.stdout.write('OK\n');
  process.stdout.write(`provider=${provider}\n`);
  process.stdout.write(`host=${host}\n`);
  process.stdout.write(`port=${port}\n`);
  process.stdout.write(`path=${path}\n`);
}

main().catch((e) => {
  fail(e && e.stack ? e.stack : String(e));
});
