# hidden_balances (NoirForge template)

This is a minimal “hidden balances” style template.

It proves a balance update without revealing the balances themselves by checking:

- `old_commitment = old_balance + old_nonce`
- `new_commitment = new_balance + new_nonce`
- `new_balance = old_balance + delta`

## Quick start (inside this repo)

From the repo root:

```bash
pnpm noirforge init hidden_balances
```

This will create `./hidden_balances/`.

## Local flow

```bash
pnpm noirforge build --circuit-dir ./hidden_balances --artifact-name hidden_balances_from_template
pnpm noirforge prove --circuit-dir ./hidden_balances --artifact-name hidden_balances_from_template
pnpm noirforge verify-local --artifact-name hidden_balances_from_template
```

## Devnet flow

```bash
pnpm noirforge deploy --artifact-name hidden_balances_from_template --cluster devnet
pnpm noirforge verify-onchain --artifact-name hidden_balances_from_template --cluster devnet
```

## SDK client script

This uses the TypeScript SDK (built JS output) to submit an on-chain verification tx from a `noirforge.json` manifest.

```bash
pnpm -C packages/sdk-ts build
node hidden_balances/client/verify-from-manifest.js \
  --manifest artifacts/hidden_balances_from_template/local/noirforge.json \
  --rpc https://api.devnet.solana.com \
  --cu-limit 250000
```

By default, the payer keypair is `~/.config/solana/id.json`.
