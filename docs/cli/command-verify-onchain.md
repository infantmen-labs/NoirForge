---
title: verify-onchain
slug: commands/verify-onchain
---

`noirforge verify-onchain` submits a Solana transaction that invokes the deployed verifier program.

## Synopsis

```bash
noirforge verify-onchain \
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
  - Run `noirforge deploy --cluster devnet` first.

## Instruction payload

The verifier instruction data is:

- `instruction_data = proof_bytes || public_witness_bytes`

See `concepts/instruction-encoding`.

## See also

- [CLI configuration](/docs/cli/configuration)
- [Instruction encoding](/docs/concepts/instruction-encoding)

## Defaults

- Cluster defaults to `outputs.deployed_cluster` (or `devnet`).
- Payer defaults to `~/.config/solana/id.json` (override with `--payer`).

## Manifest updates

Records:

- `outputs.verify_onchain_cluster`
- `outputs.verify_onchain_program_id`
- `outputs.verify_onchain_signature`

## Mainnet safety

- The CLI refuses `--cluster mainnet-beta` unless you pass `--allow-mainnet`.
