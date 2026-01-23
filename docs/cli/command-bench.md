---
title: bench
slug: commands/bench
---

`noirforge bench` runs the local pipeline end-to-end and prints timing metrics. With `--cluster`, it also deploys and verifies on-chain.

## Synopsis

```bash
noirforge bench \
  [--circuit-dir <path>] \
  [--artifact-name <name>] \
  [--out-dir <path>] \
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

- `noirforge build`
- `noirforge prove`
- `noirforge verify-local`

If `--cluster` is provided:

- `noirforge deploy --cluster <...>`
- `noirforge verify-onchain --cluster <...>`
- `noirforge tx-stats --cluster <...>`

## Output

Prints a simple key/value report:

- `artifact_name`
- `build_ms`
- `prove_ms`
- `verify_local_ms`

If `--cluster` is provided:

- `cluster`
- `deploy_ms`
- `verify_onchain_ms`
- `tx_stats_ms`

## Notes

- Mainnet usage requires explicit `--allow-mainnet`.
- RPC flags are forwarded to the on-chain steps.
