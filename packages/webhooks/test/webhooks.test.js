const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');

const { createWebhookServer } = require('../src/index.js');

function signQuickNode({ secret, nonce, timestamp, payload }) {
  const msg = String(nonce) + String(timestamp) + String(payload);
  return crypto.createHmac('sha256', Buffer.from(String(secret))).update(Buffer.from(msg)).digest('hex');
}

function post({ port, path, headers, body }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        method: 'POST',
        host: '127.0.0.1',
        port,
        path,
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(body),
          ...headers,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') });
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

test('quicknode webhook: accepts valid signature and rejects invalid signature', async () => {
  const secret = 'test_secret';
  const srv = createWebhookServer({ provider: 'quicknode', port: 0, host: '127.0.0.1', quicknodeSecret: secret });
  await new Promise((resolve) => srv.server.listen(0, '127.0.0.1', resolve));
  const port = srv.server.address().port;

  try {
    const nonce = 'n1';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const payload = JSON.stringify({ hello: 'world' });
    const sig = signQuickNode({ secret, nonce, timestamp, payload });

    const ok = await post({
      port,
      path: '/webhook',
      headers: {
        'x-qn-nonce': nonce,
        'x-qn-timestamp': timestamp,
        'x-qn-signature': sig,
      },
      body: payload,
    });
    assert.equal(ok.status, 200);

    const bad = await post({
      port,
      path: '/webhook',
      headers: {
        'x-qn-nonce': 'n2',
        'x-qn-timestamp': timestamp,
        'x-qn-signature': '00',
      },
      body: payload,
    });
    assert.equal(bad.status, 401);
  } finally {
    await new Promise((resolve) => srv.server.close(resolve));
  }
});

test('quicknode webhook: idempotency rejects duplicates', async () => {
  const secret = 'test_secret';
  const srv = createWebhookServer({ provider: 'quicknode', port: 0, host: '127.0.0.1', quicknodeSecret: secret, idempotencyTtlMs: 60_000 });
  await new Promise((resolve) => srv.server.listen(0, '127.0.0.1', resolve));
  const port = srv.server.address().port;

  try {
    const nonce = 'dup_nonce';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const payload = JSON.stringify({ n: 1 });
    const sig = signQuickNode({ secret, nonce, timestamp, payload });

    const first = await post({
      port,
      path: '/webhook',
      headers: {
        'x-qn-nonce': nonce,
        'x-qn-timestamp': timestamp,
        'x-qn-signature': sig,
      },
      body: payload,
    });
    assert.equal(first.status, 200);

    const second = await post({
      port,
      path: '/webhook',
      headers: {
        'x-qn-nonce': nonce,
        'x-qn-timestamp': timestamp,
        'x-qn-signature': sig,
      },
      body: payload,
    });
    assert.equal(second.status, 200);
    assert.equal(second.body, 'duplicate');
  } finally {
    await new Promise((resolve) => srv.server.close(resolve));
  }
});
