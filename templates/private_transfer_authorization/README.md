# private_transfer_authorization (NoirForge template)

This is a minimal “proof-gated transfer authorization” toy circuit:

- Public: `sender_0`, `sender_1`, `recipient_0`, `recipient_1`, `mint_0`, `mint_1`, `amount`, `auth_tag`
- Private: `secret`, `nonce`

Constraints:

- `secret + nonce + sender_0 + sender_1 + recipient_0 + recipient_1 + mint_0 + mint_1 + amount == auth_tag`

This models a verifier accepting a transfer only when the prover knows a private authorization secret consistent with a public transfer request.

## Public input encoding

This template is intended to drive a proof-gated SPL token transfer demo.

- `sender`, `recipient`, and `mint` are Solana pubkeys (32 bytes)
- Each pubkey is encoded as two `Field` limbs:
  - limb `*_0` is the first 16 bytes (big-endian)
  - limb `*_1` is the last 16 bytes (big-endian)
- `amount` is intended to be the SPL token base-unit amount (a positive `u64`)

Public input order in the `.pw` public witness is:

1. `sender_0`
2. `sender_1`
3. `recipient_0`
4. `recipient_1`
5. `mint_0`
6. `mint_1`
7. `amount`
8. `auth_tag`

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

Devnet example:

- Program ID (devnet): `2DbKgTxPqF2pk835bqetK7RqcAudUhbTcPE7wVWuMprr`
- Example verify+transfer tx (devnet): https://explorer.solana.com/tx/2bhiT1WVM66PYixGbhAaeoV5qKaVeswQQbuWDm12sJXnr7FuoerXm4x7JzmJJ8KtXrGMwDwPb6yTtYpDjuQGyhry?cluster=devnet

## SDK client script

```bash
pnpm -C packages/sdk-ts build
node private_transfer_authorization/client/verify-from-manifest.js \
  --manifest artifacts/private_transfer_auth_from_template/local/noirforge.json \
  --rpc https://api.devnet.solana.com \
  --cu-limit 250000
```
