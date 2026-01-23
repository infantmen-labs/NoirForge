# Webhooks receiver

NoirForge includes a minimal webhook receiver service under `packages/webhooks`.

It is intended as a small, auditable component you can run to accept provider webhooks, verify them, and optionally persist the raw payloads for later indexing.

## Run

From the repo root:

```bash
pnpm -C packages/webhooks start
```

Or run the binary directly:

```bash
pnpm noirforge-webhooks --provider quicknode --host 127.0.0.1 --port 8787 --path /webhook
```

## Configuration

Core settings:

- `NOIRFORGE_WEBHOOK_PROVIDER=quicknode|helius` (default: `quicknode`)
- `NOIRFORGE_WEBHOOK_HOST` (default: `127.0.0.1`)
- `NOIRFORGE_WEBHOOK_PORT` (default: `8787`)
- `NOIRFORGE_WEBHOOK_PATH` (default: `/webhook`)

Persistence (optional JSONL sinks):

- `NOIRFORGE_WEBHOOK_EVENTS_PATH=<path>`: append accepted webhook payloads
- `NOIRFORGE_WEBHOOK_DLQ_PATH=<path>`: append rejected/errored payloads

Observability:

- `NOIRFORGE_WEBHOOK_OBS_LOG=1`: emit structured JSON logs to stderr
- `NOIRFORGE_WEBHOOK_OBS_EVENTS_PATH=<path>`: append per-request JSON events (kind=`webhook_req`) to a JSONL file

## Provider verification

### QuickNode

Required secret:

- `NOIRFORGE_QN_WEBHOOK_SECRET`

Required headers:

- `X-QN-Nonce`
- `X-QN-Timestamp`
- `X-QN-Signature`

Verification behavior:

- The server validates the timestamp to reduce replay risk (default skew tolerance is ~5 minutes).
- The signature is verified using HMAC-SHA256 over:

```
nonce + timestamp + raw_body_utf8
```

### Helius

Required header value:

- `NOIRFORGE_HELIUS_WEBHOOK_AUTHORIZATION`

Verification behavior:

- The server compares the incoming `Authorization` header to the configured value.

## Payload handling

- Requests are accepted only for `POST` to the configured `NOIRFORGE_WEBHOOK_PATH`.
- `Content-Encoding: gzip` is supported.
- Requests larger than the internal maximum are rejected.

## Idempotency

The receiver maintains an in-memory idempotency cache.

- It prefers `X-NoirForge-Idempotency-Key` or `X-Idempotency-Key` when present.
- Otherwise it falls back to `X-QN-Nonce` (when present) or `sha256(payload)`.

Duplicate deliveries within the cache TTL are acknowledged with a `200 duplicate` response.

For guidance on handling webhook secrets and logs, see `security/secrets-and-credentials`.
