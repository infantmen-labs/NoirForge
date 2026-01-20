# sdk-ts-verify-from-manifest

This example submits an on-chain verification transaction using the TypeScript SDK and a NoirForge artifact manifest (`noirforge.json`).

## Prerequisites

- `pnpm install`
- `solana` configured (payer defaults to `~/.config/solana/id.json`)

## Run

Build a template artifact and deploy it first:

```bash
tmpdir="$(mktemp -d)"
pnpm noirforge init sum_a_b "$tmpdir/sum_a_b"
pnpm noirforge build --circuit-dir "$tmpdir/sum_a_b" --artifact-name example_sum_a_b
pnpm noirforge prove --circuit-dir "$tmpdir/sum_a_b" --artifact-name example_sum_a_b
pnpm noirforge deploy --artifact-name example_sum_a_b --cluster devnet
```

Build the SDK and submit the verification transaction:

```bash
pnpm -C packages/sdk-ts build
node examples/sdk-ts-verify-from-manifest/verify-from-manifest.js \
  --manifest artifacts/example_sum_a_b/devnet/noirforge.json \
  --rpc https://api.devnet.solana.com \
  --cu-limit 250000
```
