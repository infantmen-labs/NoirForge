# CLI commands

This is a high-level reference for the current CLI command surface.

For detailed behavior and examples, use the per-command pages under `CLI → Command Reference`.

## Project and pipeline

- `init <template> [dest]` → [`commands/init`](commands/init)
- `codegen --artifact-name <name>` → [`commands/codegen`](commands/codegen)
- `test --circuit-dir <path>` → [`commands/test`](commands/test)
- `compile --circuit-dir <path> --artifact-name <name>` → [`commands/compile`](commands/compile)
- `setup --circuit-dir <path> --artifact-name <name>` → [`commands/setup`](commands/setup)
- `build --circuit-dir <path> --artifact-name <name>` → [`commands/build`](commands/build)
- `prove --circuit-dir <path> --artifact-name <name>` → [`commands/prove`](commands/prove)
- `rerun-prove --artifact-name <name>` → [`commands/rerun-prove`](commands/rerun-prove)
- `verify-local --artifact-name <name>` → [`commands/verify-local`](commands/verify-local)

## Solana

- `deploy --artifact-name <name> --cluster <devnet|...>` → [`commands/deploy`](commands/deploy)
- `verify-onchain --artifact-name <name> --cluster <devnet|...>` → [`commands/verify-onchain`](commands/verify-onchain)
- `simulate-onchain --artifact-name <name> --cluster <devnet|...>` → [`commands/simulate-onchain`](commands/simulate-onchain)

## Observability

- `tx-stats --artifact-name <name> [--signature <sig>]` → [`commands/tx-stats`](commands/tx-stats)
- `index-tx --artifact-name <name> --signature <sig> [--index-path <path>]` → [`commands/index-tx`](commands/index-tx)
- `index-program --program-id <pubkey> [--limit <n>]` → [`commands/index-program`](commands/index-program)
- `report-index [--index-path <path>] [--format <json|kv>]` → [`commands/report-index`](commands/report-index)

## Bench and diagnostics

- `bench [--cluster <...>]` → [`commands/bench`](commands/bench)
- `doctor` → [`commands/doctor`](commands/doctor)

## Help

- `help` → [`commands/help`](commands/help)

For detailed semantics, see `living-spec`.
