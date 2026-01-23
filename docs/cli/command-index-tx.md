---
title: index-tx
slug: commands/index-tx
---

`noirforge index-tx` fetches a transaction and appends an indexing record to a local JSONL file.

This is primarily for observability/UX (it is not cryptographic verification).

## Synopsis

```bash
noirforge index-tx \
  [--artifact-name <name>] \
  [--out-dir <path>] \
  [--signature <sig>] \
  [--cluster <devnet|mainnet-beta|testnet|localhost|url>] \
  [--index-path <path>] \
  [--helius-enhanced <0|1>] \
  [--helius-api-key <key>] \
  [--rpc-provider <default|quicknode|helius>] \
  [--rpc-url <url>] \
  [--rpc-endpoints <csv>] \
  [--ws-url <url>] \
  [--ws-endpoints <csv>]
```

## Inputs

- `--signature <sig>`
  - If omitted, is inferred from `noirforge.json` as in `tx-stats`.
- `--index-path <path>`
  - Default: `artifacts/<artifact>/local/noirforge-index.jsonl` (or `./noirforge-index.jsonl` if no artifact).

## Output

- Appends a `tx` record (raw transaction metadata)
- If the transaction matches a NoirForge verification call, also appends a `noirforge_verify` record

## Helius enhanced indexing (optional)

If enabled (`--helius-enhanced 1` or `NOIRFORGE_HELIUS_ENHANCED=1`):

- Fetches enhanced transaction data from Helius and appends a `tx_enhanced` record.
- Requires an API key via `--helius-api-key` or `NOIRFORGE_HELIUS_API_KEY`.

## Requirements

- Requires `@solana/web3.js`.
