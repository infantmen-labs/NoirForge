# Threat model

This document describes the high-level threat model for NoirForge (CLI + SDKs + templates), with an emphasis on protecting keys, ensuring artifact integrity, and minimizing supply-chain and deployment risk.

## Scope

In scope:

- Developer machines running `noirforge`.
- CI runners building/testing/releasing artifacts.
- Release artifacts (npm/crate tarballs, SBOM/provenance) and their consumers.
- The on-chain verifier program produced by Sunspot and deployed to Solana.
- RPC/WebSocket providers used for devnet/mainnet interactions.

Out of scope:

- Security of third-party dependencies themselves (Noir, Sunspot, Solana, Node/Rust ecosystems), except where mitigations are possible.
- Wallet/browser security for end users (unless/when a browser-based SDK/UI is introduced).

## Security goals

- Prevent unintended key disclosure (payer keys, upgrade authority keys, CI/release secrets).
- Prevent tampering with NoirForge artifacts/manifests that could cause:
  - deploying the wrong program
  - verifying against the wrong program
  - signing unintended transactions
- Reduce supply-chain risk (dependency compromise, build contamination).
- Ensure mainnet operations require explicit, intentional operator actions.

## Primary assets

- Payer keypairs used to sign Solana transactions.
- Program upgrade authority keys (especially for mainnet).
- CI secrets (release credentials, signing keys, provider credentials).
- Artifact directories and `noirforge.json` manifests.
- The deployed verifier program id(s) and the `.so` being deployed.

## Trust boundaries

- Local filesystem boundary:
  - untrusted user inputs/paths vs trusted artifact directories.
- Network boundary:
  - RPC/WebSocket providers are external dependencies and may be degraded or malicious.
- Build boundary:
  - local builds and CI builds must be treated as potentially different unless made reproducible/verifiable.

## Threat actors

- Opportunistic attackers scraping repos for secrets.
- Malicious contributors (PRs adding credential exfiltration or artifact tampering).
- Compromised dependency/toolchain distribution channel.
- Compromised RPC provider or MITM (less likely with TLS, but still consider provider-level manipulation).
- Operator error (deploying to mainnet unintentionally, using wrong cluster/program id).

## Attack surfaces and threats

### Developer workstation

- Secret leakage:
  - committing keypairs, `.env`, or authority keys.
  - accidental logging of sensitive paths/content.
- Artifact tampering:
  - a malicious local process or dependency modifies `noirforge.json` or proof inputs.
- Path confusion:
  - passing a manifest path pointing outside the expected artifact directory.

### CI / release pipeline

- Malicious dependency update or compromised registry.
- Build contamination:
  - unpinned tools, non-reproducible builds producing different outputs.
- Secret exfiltration via CI logs or build steps.

### RPC/WebSocket providers

- Availability attacks:
  - rate limits, outages, partial failures.
- Integrity attacks:
  - returning inconsistent account state, simulating success/failure incorrectly, or hiding errors.

### On-chain deployment and verification

- Operator error:
  - deploying to `mainnet-beta` unintentionally.
  - verifying against the wrong program id.
- Upgrade authority mistakes:
  - losing authority, using an unsafe authority, or leaving programs mutable unintentionally.

## Mitigations (current)

- Toolchain pinning via `tool-versions` and dockerized/verifiable build posture.
- `.gitignore` patterns for common secrets (keypairs, env files).
- CLI mainnet safety gate:
  - `deploy`, `verify-onchain`, and `simulate-onchain` refuse `--cluster mainnet-beta` unless `--allow-mainnet` is provided.
- CI supply-chain posture:
  - lockfiles and pinned workflows
  - SBOM/provenance generation for releases

## Recommended operator practices

- Prefer an explicit upgrade authority policy for mainnet (multisig/timelock) or immutable deploys.
- Treat artifact directories as sensitive build outputs:
  - store them in trusted locations
  - avoid running untrusted scripts in the same workspace
- Use dedicated keys per environment:
  - devnet keys should be disposable
  - mainnet keys should be protected by hardware or a managed secret system

## Open items / roadmap-linked controls

- Formalize key management policy (where secrets live, rotation, incident response).
- Formalize dependency update policy and review gates.
- Define a machine-validated `noirforge.json` schema and enforce it in CI.
- Expand cross-validation test vectors and deterministic serialization checks.
- Define explicit mainnet release gates tied to audit readiness and provenance requirements.
