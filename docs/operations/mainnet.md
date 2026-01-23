# Mainnet operations

Mainnet deployment is intentionally treated as a separate milestone.

## Safety gate

The CLI refuses `--cluster mainnet-beta` unless you pass `--allow-mainnet`.

## Readiness

- Public checklist: `mainnet-readiness`
- Internal runbook: `mainnet-runbook`

## Recommended policy

- Default recommendation: immutable deployments (`--final`) for releases.
- If mutable, use an explicit upgrade authority and prefer a multisig/timelock.

For key custody rules, see `key-management`.
