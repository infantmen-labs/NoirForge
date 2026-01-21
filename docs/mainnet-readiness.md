# Mainnet readiness checklist

This document defines the public-facing gates and checks required before running NoirForge verifier deployments and on-chain verification flows on Solana `mainnet-beta`.

This checklist is intentionally high-level and does not include sensitive operational details (private key handling, internal runbooks, or incident response playbooks). For security posture and assumptions, see `docs/threat-model.md`.

## Scope

- Deploying the verifier program produced by `sunspot deploy`.
- Sending verification transactions (`verify-onchain`).
- Mainnet-specific safety and release gates.

## Definitions

- **Release artifact**: a tagged build output that includes the CLI/SDK distributions and provenance metadata.
- **Verifiable build**: a build process that is deterministic/reproducible enough to provide strong confidence that the published artifacts match source.
- **Upgrade authority**: the key or governance mechanism controlling upgrades of a Solana program.

## Hard gates (must be true)

- CLI mainnet opt-in is enforced:
  - NoirForge refuses `--cluster mainnet-beta` unless `--allow-mainnet` is provided.
- Toolchain is pinned:
  - Tool versions match the repository’s pinned toolchain.
- Release artifacts exist and are reviewed:
  - SBOM is generated and attached to the release.
  - Provenance/attestation artifacts exist for the release.

## Audit readiness gates

- The audit plan is complete and explicitly scoped.
- Minimum review areas:
  - Verifier artifact generation pipeline (`sunspot deploy` → `.so` + keypair).
  - Instruction encoding contract (`proof_bytes || public_witness_bytes`) and length checks.
  - Deployment controls and upgrade authority handling.
  - CI pinning and release provenance.

## Operational safety gates

- Mainnet RPC provider choice is deliberate:
  - Identify the RPC endpoints used for mainnet operations.
  - Define rate-limit and failover posture.
- Key custody policy is followed:
  - See `docs/key-management.md`.

## Recommended deployment mode (policy)

- Default recommendation for mainnet releases: **immutable deploys**.
  - Use `noirforge deploy --cluster mainnet-beta --allow-mainnet --final`.
- If mutable deployments are required:
  - Use an explicit upgrade authority (`--upgrade-authority <keypair.json>`).
  - Prefer a governance-controlled authority (multisig/timelock).
  - Separate roles:
    - payer keypair for fees
    - authority keypair for upgrades

## Pre-flight checks (before deploying)

- Run the local pipeline:
  - `noirforge test`
  - `noirforge build`
  - `noirforge prove`
  - `noirforge verify-local`
- Confirm the artifact manifest is well-formed:
  - `noirforge.json` uses schema version 1.
  - Required outputs exist (proof, public witness, vk).
- Confirm compute budget expectations:
  - If needed, pass `--cu-limit <n>` to `verify-onchain`.

## Smoke checks (after deploying)

- Run at least one successful `verify-onchain` against the deployed program.
- Capture and record:
  - deployed program id
  - deploy signature
  - verify signature
  - compute units and fee (via `tx-stats`)

## Roll-forward / rollback expectations

- If program is mutable and authority is controlled:
  - roll forward by upgrading to a fixed verifier.
- If program is immutable:
  - roll forward by deploying a new verifier program id and publishing the new id as the supported verifier.

## Exit criteria

Mainnet readiness is satisfied when:

- All hard gates are true.
- Audit readiness gates are met.
- A mainnet smoke deploy/verify has been performed in a controlled environment.
- Upgrade authority policy is explicitly selected and documented for the release.
