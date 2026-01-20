const http = require('node:http');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

function envTruthy(v) {
  return v === true || v === 'true' || v === '1';
}

function readRequestBody(req, limitBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > limitBytes) {
        reject(new Error('payload_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function maybeGunzip(req, body) {
  const enc = String(req.headers['content-encoding'] || '').toLowerCase();
  if (enc !== 'gzip') return body;
  return zlib.gunzipSync(body);
}

function timingSafeEqualHex(aHex, bHex) {
  try {
    const a = Buffer.from(String(aHex), 'hex');
    const b = Buffer.from(String(bHex), 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function verifyQuickNodeSignature({ secret, rawBodyUtf8, nonce, timestamp, signatureHex }) {
  const msg = String(nonce) + String(timestamp) + String(rawBodyUtf8);
  const computed = crypto.createHmac('sha256', Buffer.from(String(secret))).update(Buffer.from(msg)).digest('hex');
  return timingSafeEqualHex(computed, signatureHex);
}

function sha256Hex(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function appendJsonl(filePath, obj) {
  const line = JSON.stringify(obj) + '\n';
  require('node:fs').appendFileSync(filePath, line);
}

function createIdempotencyStore({ ttlMs }) {
  const store = new Map();

  function gc(now) {
    for (const [k, v] of store.entries()) {
      if (v.expiresAt <= now) store.delete(k);
    }
  }

  return {
    has(key, now) {
      gc(now);
      return store.has(key);
    },
    put(key, now) {
      gc(now);
      store.set(key, { expiresAt: now + ttlMs });
    },
  };
}

function createWebhookServer(opts) {
  const provider = (opts && opts.provider ? String(opts.provider) : 'quicknode').toLowerCase();
  const port = opts && typeof opts.port === 'number' ? opts.port : 8787;
  const host = (opts && opts.host) || '127.0.0.1';
  const path = (opts && opts.path) || '/webhook';

  const obsLogEnabled =
    opts && typeof opts.obsLogEnabled === 'boolean' ? opts.obsLogEnabled : envTruthy(process.env.NOIRFORGE_WEBHOOK_OBS_LOG);
  const obsEventsPath =
    opts && typeof opts.obsEventsPath === 'string'
      ? opts.obsEventsPath
      : process.env.NOIRFORGE_WEBHOOK_OBS_EVENTS_PATH || null;
  let obsEventsDirReady = false;

  function obsEmit(obj) {
    if (!obsLogEnabled && !obsEventsPath) return;
    const line = JSON.stringify(obj);

    if (obsLogEnabled) {
      process.stderr.write(line + '\n');
    }

    if (obsEventsPath) {
      try {
        const fs = require('node:fs');
        if (!obsEventsDirReady) {
          fs.mkdirSync(require('node:path').dirname(obsEventsPath), { recursive: true });
          obsEventsDirReady = true;
        }
        fs.appendFileSync(obsEventsPath, line + '\n');
      } catch {
      }
    }
  }

  const maxBodyBytes = opts && typeof opts.maxBodyBytes === 'number' ? opts.maxBodyBytes : 50 * 1024 * 1024;
  const replaySkewMs = opts && typeof opts.replaySkewMs === 'number' ? opts.replaySkewMs : 5 * 60 * 1000;
  const idempotencyTtlMs = opts && typeof opts.idempotencyTtlMs === 'number' ? opts.idempotencyTtlMs : 10 * 60 * 1000;
  const dlqPath = opts && typeof opts.dlqPath === 'string' ? opts.dlqPath : null;
  const eventsPath = opts && typeof opts.eventsPath === 'string' ? opts.eventsPath : null;

  const qnSecret = opts && typeof opts.quicknodeSecret === 'string' ? opts.quicknodeSecret : null;
  const heliusAuth = opts && typeof opts.heliusAuthorization === 'string' ? opts.heliusAuthorization : null;

  const idempotency = createIdempotencyStore({ ttlMs: idempotencyTtlMs });

  const server = http.createServer(async (req, res) => {
    const startedAt = Date.now();
    function respond(statusCode, body, extra) {
      res.statusCode = statusCode;
      res.end(body);
      obsEmit({
        kind: 'webhook_req',
        at: new Date(Date.now()).toISOString(),
        provider,
        method: req.method,
        path: req.url,
        status_code: statusCode,
        result: body,
        duration_ms: Date.now() - startedAt,
        ...(extra && typeof extra === 'object' ? extra : {}),
      });
    }

    if (req.method !== 'POST' || req.url !== path) {
      respond(404, 'not_found');
      return;
    }

    let raw;
    try {
      raw = await readRequestBody(req, maxBodyBytes);
    } catch (e) {
      const status = e && e.message === 'payload_too_large' ? 413 : 400;
      respond(status, 'bad_request', { error: e && e.message ? e.message : String(e) });
      return;
    }

    const rawMaybe = maybeGunzip(req, raw);
    const now = Date.now();

    const nonce = req.headers['x-qn-nonce'];
    const timestamp = req.headers['x-qn-timestamp'];
    const signature = req.headers['x-qn-signature'];

    const explicitIdempotency = req.headers['x-noirforge-idempotency-key'] || req.headers['x-idempotency-key'];
    const fallbackIdempotency = nonce || sha256Hex(rawMaybe);
    const idemKey = String(explicitIdempotency || fallbackIdempotency);

    const payloadSha256 = sha256Hex(rawMaybe);

    if (idempotency.has(idemKey, now)) {
      respond(200, 'duplicate', { idempotency_key: idemKey, payload_sha256: payloadSha256 });
      return;
    }

    try {
      if (provider === 'quicknode') {
        if (!qnSecret) {
          respond(500, 'server_misconfigured', { idempotency_key: idemKey, payload_sha256: payloadSha256 });
          return;
        }

        if (!nonce || !timestamp || !signature) {
          respond(400, 'missing_headers', { idempotency_key: idemKey, payload_sha256: payloadSha256 });
          return;
        }

        const tsMs = Number(timestamp) * 1000;
        if (!Number.isFinite(tsMs) || Math.abs(now - tsMs) > replaySkewMs) {
          respond(401, 'replay_rejected', { idempotency_key: idemKey, payload_sha256: payloadSha256 });
          return;
        }

        const ok = verifyQuickNodeSignature({
          secret: qnSecret,
          rawBodyUtf8: rawMaybe.toString('utf8'),
          nonce: String(nonce),
          timestamp: String(timestamp),
          signatureHex: String(signature),
        });

        if (!ok) {
          respond(401, 'invalid_signature', { idempotency_key: idemKey, payload_sha256: payloadSha256 });
          return;
        }
      } else if (provider === 'helius') {
        if (!heliusAuth) {
          respond(500, 'server_misconfigured', { idempotency_key: idemKey, payload_sha256: payloadSha256 });
          return;
        }

        const auth = req.headers['authorization'];
        if (String(auth || '') !== String(heliusAuth)) {
          respond(401, 'unauthorized', { idempotency_key: idemKey, payload_sha256: payloadSha256 });
          return;
        }
      } else {
        respond(500, 'unknown_provider', { idempotency_key: idemKey, payload_sha256: payloadSha256 });
        return;
      }

      idempotency.put(idemKey, now);

      if (eventsPath) {
        appendJsonl(eventsPath, {
          received_at: new Date(now).toISOString(),
          provider,
          idempotency_key: idemKey,
          headers: req.headers,
          body_base64: rawMaybe.toString('base64'),
        });
      }

      respond(200, 'ok', { idempotency_key: idemKey, payload_sha256: payloadSha256 });
    } catch (e) {
      if (dlqPath) {
        try {
          appendJsonl(dlqPath, {
            received_at: new Date(now).toISOString(),
            provider,
            idempotency_key: idemKey,
            headers: req.headers,
            body_base64: rawMaybe.toString('base64'),
            error: e && e.message ? e.message : String(e),
          });
        } catch {
        }
      }

      respond(500, 'internal_error', {
        idempotency_key: idemKey,
        payload_sha256: payloadSha256,
        error: e && e.message ? e.message : String(e),
      });
    }
  });

  return {
    server,
    listen() {
      return new Promise((resolve, reject) => {
        server.listen(port, host, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  };
}

module.exports = {
  createWebhookServer,
  verifyQuickNodeSignature,
};
