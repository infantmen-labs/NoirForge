# CLI commands

This is a high-level reference for the current CLI command surface.

## Project and pipeline

- `init <template> [dest]`
- `test --circuit-dir <path>`
- `compile --circuit-dir <path> --artifact-name <name>`
- `setup --circuit-dir <path> --artifact-name <name>`
- `build --circuit-dir <path> --artifact-name <name>`
- `prove --circuit-dir <path> --artifact-name <name>`
- `rerun-prove --artifact-name <name>`
- `verify-local --artifact-name <name>`

## Solana

- `deploy --artifact-name <name> --cluster <devnet|...>`
- `verify-onchain --artifact-name <name> --cluster <devnet|...>`
- `simulate-onchain --artifact-name <name> --cluster <devnet|...>`

## Observability

- `tx-stats --artifact-name <name> [--signature <sig>]`
- `index-tx --artifact-name <name> --signature <sig> [--index-path <path>]`
- `index-program --program-id <pubkey> [--limit <n>]`
- `report-index [--index-path <path>] [--format <json|kv>]`

## Bench and diagnostics

- `bench [--cluster <...>]`
- `doctor`

For detailed semantics, see `living-spec`.
