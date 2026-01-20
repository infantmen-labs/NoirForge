# zk_gated_access_control (NoirForge template)

This template demonstrates a minimal “ZK-gated” check:

- You keep `secret` private.
- You publish `token`.
- The circuit enforces `secret * secret == token`.

This models an access gate where the verifier accepts the proof only if the prover knows a secret that matches a public access token.

## Quick start (inside this repo)

From the repo root:

```bash
pnpm noirforge init zk_gated_access_control
```

This will create `./zk_gated_access_control/`.

## Local flow

```bash
pnpm noirforge test --circuit-dir ./zk_gated_access_control
pnpm noirforge build --circuit-dir ./zk_gated_access_control --artifact-name zk_gate_from_template
pnpm noirforge prove --circuit-dir ./zk_gated_access_control --artifact-name zk_gate_from_template
pnpm noirforge verify-local --artifact-name zk_gate_from_template
```

## Devnet flow

```bash
pnpm noirforge deploy --artifact-name zk_gate_from_template --cluster devnet
pnpm noirforge verify-onchain --artifact-name zk_gate_from_template --cluster devnet
```

## SDK client script

```bash
pnpm -C packages/sdk-ts build
node zk_gated_access_control/client/verify-from-manifest.js \
  --manifest artifacts/zk_gate_from_template/local/noirforge.json \
  --rpc https://api.devnet.solana.com \
  --cu-limit 250000
```

By default, the payer keypair is `~/.config/solana/id.json`.
