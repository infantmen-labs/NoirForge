# private_transfer_authorization (NoirForge template)

This is a minimal “proof-gated transfer authorization” toy circuit:

- Public: `recipient`, `amount`, `auth_tag`
- Private: `secret`, `nonce`

Constraints:

- `amount` is boolean (`0` or `1`)
- `secret + nonce + recipient + amount == auth_tag`

This models a verifier accepting a transfer only when the prover knows a private authorization secret consistent with a public transfer request.

## Quick start (inside this repo)

From the repo root:

```bash
pnpm noirforge init private_transfer_authorization
```

## Local flow

```bash
pnpm noirforge test --circuit-dir ./private_transfer_authorization
pnpm noirforge build --circuit-dir ./private_transfer_authorization --artifact-name private_transfer_auth_from_template
pnpm noirforge prove --circuit-dir ./private_transfer_authorization --artifact-name private_transfer_auth_from_template
pnpm noirforge verify-local --artifact-name private_transfer_auth_from_template
```

## Devnet flow

```bash
pnpm noirforge deploy --artifact-name private_transfer_auth_from_template --cluster devnet
pnpm noirforge verify-onchain --artifact-name private_transfer_auth_from_template --cluster devnet
```

## SDK client script

```bash
pnpm -C packages/sdk-ts build
node private_transfer_authorization/client/verify-from-manifest.js \
  --manifest artifacts/private_transfer_auth_from_template/local/noirforge.json \
  --rpc https://api.devnet.solana.com \
  --cu-limit 250000
```
