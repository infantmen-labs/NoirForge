# confidential_payments (NoirForge template)

This is a minimal “confidential payments” style template.

It proves a private payment amount is valid (sender has enough balance) and updates a public commitment to the sender’s balance, without revealing the balance or amount directly.

The circuit checks:

- `old_balance >= amount`
- `new_balance = old_balance - amount`
- `old_commitment = old_balance + nonce`
- `new_commitment = new_balance + nonce`
- `amount_commitment = amount + nonce`

## Quick start (inside this repo)

From the repo root:

```bash
pnpm noirforge init confidential_payments
```

This will create `./confidential_payments/`.

## Local flow

```bash
pnpm noirforge build --circuit-dir ./confidential_payments --artifact-name confidential_payments_from_template
pnpm noirforge prove --circuit-dir ./confidential_payments --artifact-name confidential_payments_from_template
pnpm noirforge verify-local --artifact-name confidential_payments_from_template
```

## Devnet flow

```bash
pnpm noirforge deploy --artifact-name confidential_payments_from_template --cluster devnet
pnpm noirforge verify-onchain --artifact-name confidential_payments_from_template --cluster devnet
```

## SDK client script

This uses the TypeScript SDK (built JS output) to submit an on-chain verification tx from a `noirforge.json` manifest.

```bash
pnpm -C packages/sdk-ts build
node confidential_payments/client/verify-from-manifest.js \
  --manifest artifacts/confidential_payments_from_template/local/noirforge.json \
  --rpc https://api.devnet.solana.com \
  --cu-limit 250000
```

By default, the payer keypair is `~/.config/solana/id.json`.
