# Secrets and credentials

This page describes where NoirForge typically uses secrets/credentials, and the recommended handling practices.

This document is about *operational hygiene* (how to avoid accidental disclosure), not about specific provider setup.

## What counts as a secret in NoirForge

Common secret categories:

- Solana keypairs
  - payer keypair used to sign transactions
  - deployment keypair (program id keypair)
  - upgrade authority keypair (especially sensitive on mainnet)
- RPC provider credentials
  - private RPC URLs (QuickNode/Helius)
  - API keys (e.g. Helius Enhanced Transactions)
- Webhook receiver secrets
  - QuickNode webhook secret used to validate signatures
  - Helius webhook authorization token/value

## Where secrets show up in configuration

### CLI

The CLI may read secrets from environment variables or flags.

Examples:

- RPC/WS endpoint configuration:
  - `NOIRFORGE_RPC_URL`, `NOIRFORGE_RPC_ENDPOINTS`
  - `NOIRFORGE_WS_URL`, `NOIRFORGE_WS_ENDPOINTS`
  - provider bundles: `NOIRFORGE_QUICKNODE_*`, `NOIRFORGE_HELIUS_*`
- Helius Enhanced indexing:
  - `NOIRFORGE_HELIUS_API_KEY` or `--helius-api-key <key>`

See `cli/configuration` for the full list.

### Webhooks receiver

The webhook receiver uses environment variables:

- `NOIRFORGE_QN_WEBHOOK_SECRET`
- `NOIRFORGE_HELIUS_WEBHOOK_AUTHORIZATION`

See `operations/webhooks` for details.

## Logging and redaction

- Do not print secrets in logs.
- Prefer environment variables to CLI flags for secrets to reduce shell history exposure.
- The CLI redacts `--helius-api-key` when emitting structured `exec_*` events.

If you enable structured logging (`NOIRFORGE_OBS_LOG` / `NOIRFORGE_OBS_EVENTS_PATH`), treat the resulting logs as potentially sensitive operational data.

## Storage recommendations

- Never commit secrets, keypairs, or `.env` files to the repo.
- Prefer OS-level secret storage (keychain/secret manager) for developer machines.
- For CI, store secrets only in the CI secret store and scope them minimally.

## Sharing artifacts

Treat artifact directories as build outputs that may be shared *only after review*:

- `noirforge.json` may contain:
  - deployed program ids
  - transaction signatures
  - absolute paths (if you did not use `--relative-paths-only`)

It should not contain private keys, but you should still review before publishing artifacts.

## Mainnet note

Mainnet deployment/verification should use:

- dedicated keys
- least privilege
- explicit upgrade authority policy (or immutable deploys)

See `key-management` and `mainnet-readiness`.
