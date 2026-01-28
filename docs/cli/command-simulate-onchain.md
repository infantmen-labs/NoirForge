---
title: simulate-onchain
slug: commands/simulate-onchain
---

`noirforge simulate-onchain` simulates the verifier transaction via RPC (no transaction is sent).

## Synopsis

```bash
noirforge simulate-onchain \
  --artifact-name <name> \
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

## Requirements

- `outputs.deployed_program_id` must exist in the manifest.

## Behavior

- Prints simulation logs to stdout.
- Prints a short key/value summary including `cluster`, `program_id`, and `compute_units_consumed` when available.
- Exits non-zero if the simulation returns an error.
- Does not update the manifest.

If you want to persist per-run compute results for later analysis, use `noirforge compute-analyze` (appends a JSONL history file).

## See also

- [CLI configuration](/docs/cli/configuration)
- [Instruction encoding](/docs/concepts/instruction-encoding)

## Mainnet safety

- The CLI refuses `--cluster mainnet-beta` unless you pass `--allow-mainnet`.
