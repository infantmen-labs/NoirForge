# private_kyc_proof (NoirForge template)

This is a minimal “private KYC proof” style template.

It proves a private `age` is above a public minimum threshold without revealing the age itself.

The circuit checks:

- `age >= min_age`
- `commitment = age + nonce`

## Quick start (inside this repo)

From the repo root:

```bash
pnpm noirforge init private_kyc_proof
```

This will create `./private_kyc_proof/`.

## Local flow

```bash
pnpm noirforge build --circuit-dir ./private_kyc_proof --artifact-name private_kyc_proof_from_template
pnpm noirforge prove --circuit-dir ./private_kyc_proof --artifact-name private_kyc_proof_from_template
pnpm noirforge verify-local --artifact-name private_kyc_proof_from_template
```

## Devnet flow

```bash
pnpm noirforge deploy --artifact-name private_kyc_proof_from_template --cluster devnet
pnpm noirforge verify-onchain --artifact-name private_kyc_proof_from_template --cluster devnet
```

## SDK client script

This uses the TypeScript SDK (built JS output) to submit an on-chain verification tx from a `noirforge.json` manifest.

```bash
pnpm -C packages/sdk-ts build
node private_kyc_proof/client/verify-from-manifest.js \
  --manifest artifacts/private_kyc_proof_from_template/local/noirforge.json \
  --rpc https://api.devnet.solana.com \
  --cu-limit 250000
```

By default, the payer keypair is `~/.config/solana/id.json`.
