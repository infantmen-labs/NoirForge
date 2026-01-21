# Dependency policy

This document describes how NoirForge manages dependencies and updates.

This is intended to reduce supply-chain risk and improve reproducibility. It is a policy document, not a release checklist.

## Scope

- Node/pnpm workspace dependencies (`package.json`, `pnpm-lock.yaml`).
- Rust dependencies (`Cargo.toml`, `Cargo.lock`).
- Pinned toolchain versions (`tool-versions`, Dockerfile).
- CI workflows that fetch/install toolchains.

## Goals

- Deterministic builds and tests across developer machines and CI.
- Fast response to known vulnerabilities.
- Minimize unreviewed dependency changes.

## Rules

- Lockfiles must be committed:
  - `pnpm-lock.yaml`
  - `Cargo.lock`
- Toolchain versions must be pinned in one place (`tool-versions`) and kept in sync with CI.
- CI must run with the pinned toolchain versions (do not rely on “latest”).

## Update process

### Routine updates

- Batch dependency updates rather than drip-feeding many small bumps.
- Prefer updating one ecosystem at a time:
  - Node/pnpm updates
  - Rust updates
  - Toolchain updates (Noir/Nargo, Solana/Anchor, Rust, Go)
- Require CI to pass before merging updates.

### Security updates

- If a dependency has a critical security advisory:
  - prioritize an update even if it’s outside the normal update cadence
  - document the reason in the PR description

## Pinned high-risk dependencies

Some dependencies have outsized impact on correctness and security and should be treated as high-risk.

- Noir/Nargo
- Sunspot
- Solana CLI / Anchor

Policy:

- Pin versions/commits.
- Prefer explicit upgrades with additional validation (smoke tests, cross-validation).

## Acceptable sources

- Dependencies should come from standard registries (npm, crates.io) and pinned git commits when required.
- Avoid unpinned git dependencies.

## Verification

- All dependency updates must pass:
  - `pnpm test`
  - relevant CI workflows
- For changes that may affect proof/verifier correctness (toolchains, Sunspot):
  - ensure the pipeline smoke test still passes
  - consider adding or updating test vectors

## Notes

- This policy does not cover private credentials (those are addressed in `docs/key-management.md`).
- For broader assumptions and trust boundaries, see `docs/threat-model.md`.
