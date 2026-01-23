---
title: index-program
slug: commands/index-program
---

`noirforge index-program` fetches recent transactions for a program id and appends them to a local JSONL index.

## Synopsis

```bash
noirforge index-program \
  [--program-id <pubkey>] \
  [--artifact-name <name>] \
  [--out-dir <path>] \
  [--cluster <devnet|mainnet-beta|testnet|localhost|url>] \
  [--index-path <path>] \
  [--limit <n>] \
  [--before <sig>] \
  [--until <sig>] \
  [--rpc-provider <default|quicknode|helius>] \
  [--rpc-url <url>] \
  [--rpc-endpoints <csv>] \
  [--ws-url <url>] \
  [--ws-endpoints <csv>]
```

## Program id resolution

- If `--program-id` is provided, it is used.
- Otherwise, NoirForge tries to infer a program id from `noirforge.json.outputs`.

If neither is available, the command fails.

## Behavior

- Fetches signatures via `getSignaturesForAddress` (default `--limit` is 100)
- For each signature, fetches transaction data via `getTransaction`
- Appends:
  - a `tx` record
  - and a `noirforge_verify` record when applicable

## Output

Prints:

- `fetched` (number of signatures fetched)
- `indexed` (number of transactions written)
- `index_path`

## Requirements

- Requires `@solana/web3.js`.
