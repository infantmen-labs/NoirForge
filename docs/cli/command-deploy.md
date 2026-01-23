---
title: deploy
slug: commands/deploy
---

`noirforge deploy` builds a Solana verifier program from a verifying key, and optionally deploys it to a Solana cluster.

## Synopsis

```bash
noirforge deploy \
  --artifact-name <name> \
  [--out-dir <path>] \
  [--relative-paths-only] \
  [--cluster <devnet|mainnet-beta|testnet|localhost|url>] \
  [--allow-mainnet] \
  [--upgrade-authority <keypair.json>] \
  [--final]
```

## Environment requirement

- `GNARK_VERIFIER_BIN` must be set to Sunspot’s `gnark-solana/crates/verifier-bin` directory.

## What it runs

- `sunspot deploy <vk>`
  - This builds a Solana BPF program via `cargo build-sbf` inside `GNARK_VERIFIER_BIN`.

If `--cluster` is provided:

- `solana program deploy`

## Outputs

Sunspot writes outputs next to the `.vk` file; NoirForge records:

- `<name>.so`
- `<name>-keypair.json`
- `outputs.built_program_id` (derived from the keypair)

With `--cluster`:

- `outputs.deployed_cluster`
- `outputs.deployed_program_id`
- `outputs.deployed_program_deploy_signature` (when available)
- `outputs.deployed_program_upgrade_authority` (when available)

## Mainnet safety

- The CLI refuses `--cluster mainnet-beta` unless you pass `--allow-mainnet`.

## Upgrade authority

- `--final` deploys an immutable program.
- `--upgrade-authority <keypair.json>` sets an explicit upgrade authority.
- These are mutually exclusive.
