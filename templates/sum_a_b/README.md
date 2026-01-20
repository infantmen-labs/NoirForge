# sum_a_b (NoirForge template)

This is a minimal Noir circuit template that proves knowledge of private inputs `a` and `b` and exposes `a + b` as a public output.

## Quick start (inside this repo)

From the repo root:

```bash
pnpm noirforge init sum_a_b
```

This will create `./sum_a_b/`.

## Local flow

```bash
pnpm noirforge build --circuit-dir ./sum_a_b --artifact-name sum_a_b_from_template
pnpm noirforge prove --circuit-dir ./sum_a_b --artifact-name sum_a_b_from_template
pnpm noirforge verify-local --artifact-name sum_a_b_from_template
```

## Devnet flow

```bash
pnpm noirforge deploy --artifact-name sum_a_b_from_template --cluster devnet
pnpm noirforge verify-onchain --artifact-name sum_a_b_from_template --cluster devnet
```

## SDK client script

This uses the TypeScript SDK (built JS output) to submit an on-chain verification tx from a `noirforge.json` manifest.

```bash
pnpm -C packages/sdk-ts build
node sum_a_b/client/verify-from-manifest.js \
  --manifest artifacts/sum_a_b_from_template/local/noirforge.json \
  --rpc https://api.devnet.solana.com \
  --cu-limit 250000
```

By default, the payer keypair is `~/.config/solana/id.json`.
