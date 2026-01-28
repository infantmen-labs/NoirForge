---
title: flow
slug: commands/flow
---

`noirforge flow` runs a single end-to-end “ZK flow harness” for a circuit.

It is intended as a single command you can run for template QA and judge demos.

## Synopsis

```bash
noirforge flow \
  [--template <name>] \
  [--dest <path>] \
  [--circuit-dir <path>] \
  [--artifact-name <name>] \
  [--out-dir <path>] \
  [--relative-paths-only] \
  [--cluster <devnet|mainnet-beta|testnet|localhost|url>] \
  [--allow-mainnet] \
  [--cu-limit <n>] \
  [--payer <keypair.json>] \
  [--rpc-provider <default|quicknode|helius>] \
  [--rpc-url <url>] \
  [--rpc-endpoints <csv>] \
  [--ws-url <url>] \
  [--ws-endpoints <csv>]
```

## What it runs

Always:

- `noirforge test`
- `noirforge build`
- `noirforge prove`
- `noirforge verify-local`

If `--template` is provided:

- `noirforge init <template> <dest>`

If `--cluster` is provided:

- `noirforge deploy --cluster <...>`
- `noirforge verify-onchain --cluster <...>`
- `noirforge tx-stats --cluster <...>`

Note:

- The on-chain steps require a payer keypair (defaults to `~/.config/solana/id.json`; override with `--payer`).

## Output

Prints a simple key/value report.

Always:

- `circuit_dir`
- `artifact_name`
- `test_ms`
- `build_ms`
- `prove_ms`
- `verify_local_ms`

If `--template` is provided:

- `template`
- `dest`
- `init_ms`

If `--cluster` is provided:

- `cluster`
- `deploy_ms`
- `verify_onchain_ms`
- `tx_stats_ms`

## Examples

Run the full local harness for a template that already exists on disk:

```bash
pnpm noirforge flow --circuit-dir ./templates/private_transfer_authorization --artifact-name private_transfer_auth_from_template
```

Run local harness and then deploy+verify on devnet:

```bash
pnpm noirforge flow --circuit-dir ./templates/private_transfer_authorization --artifact-name private_transfer_auth_from_template --cluster devnet
```

After a successful run, useful follow-ups:

```bash
pnpm noirforge sizes --artifact-name private_transfer_auth_from_template
pnpm noirforge compute-analyze --artifact-name private_transfer_auth_from_template --cluster devnet --payer ~/.config/solana/id.json
```
