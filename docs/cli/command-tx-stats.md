---
title: tx-stats
slug: commands/tx-stats
---

`noirforge tx-stats` fetches a Solana transaction by signature and prints basic metadata (fee, compute units, error).

## Synopsis

```bash
noirforge tx-stats \
  [--artifact-name <name>] \
  [--out-dir <path>] \
  [--signature <sig>] \
  [--cluster <devnet|mainnet-beta|testnet|localhost|url>] \
  [--rpc-provider <default|quicknode|helius>] \
  [--rpc-url <url>] \
  [--rpc-endpoints <csv>] \
  [--ws-url <url>] \
  [--ws-endpoints <csv>]
```

## Signature resolution

If `--signature` is not provided, NoirForge tries to infer it from `noirforge.json.outputs`:

- `verify_onchain_signature` (preferred)
- `deployed_program_deploy_signature`
- `verify_onchain_deploy_signature`

## Output

On success, prints:

- `cluster`
- `signature`
- `slot`
- `block_time` (when available)
- `fee_lamports` (when available)
- `compute_units` (when available)
- `err` (when present)

## See also

- [CLI configuration](/docs/cli/configuration)

## Requirements

- Requires `@solana/web3.js` in the CLI workspace.
