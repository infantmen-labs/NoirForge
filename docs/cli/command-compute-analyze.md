---
title: compute-analyze
slug: commands/compute-analyze
---

`noirforge compute-analyze` simulates the verifier transaction via RPC, extracts compute units (when available), and appends a JSONL history record.

## Synopsis

```bash
noirforge compute-analyze \
  --artifact-name <name> \
  [--out-dir <path>] \
  [--history-path <path>] \
  [--print-logs <0|1>] \
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
- Requires `@solana/web3.js`.

## History file

By default, appends newline-delimited JSON to:

- `artifacts/<artifact_name>/local/noirforge-compute.jsonl`

Override with `--history-path <path>`.

## Behavior

- Runs a `simulateTransaction` call (no transaction is sent).
- Appends a JSON record including:
  - `cluster`, `program_id`, `cu_limit`, `compute_units_consumed`, `ok`, `err`
- Exits non-zero if the simulation returns an error.
- If `--print-logs 1` is set, also prints simulation logs to stdout.

## Example

```bash
pnpm noirforge compute-analyze \
  --artifact-name private_transfer_auth_from_template \
  --cluster devnet \
  --payer ~/.config/solana/id.json
```

Then visualize the resulting history file:

- `artifacts/private_transfer_auth_from_template/local/noirforge-compute.jsonl`

by uploading it into the docs-site `/metrics` page.

## See also

- [simulate-onchain](/docs/cli/commands/simulate-onchain)
- [Indexing and observability](/docs/concepts/indexing-and-observability)
