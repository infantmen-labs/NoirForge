# Introduction

NoirForge is a CLI-first toolkit for running a reproducible Noir + Sunspot pipeline and verifying proofs on Solana.

It provides:

- A pinned toolchain (Noir/Nargo, Sunspot, Solana, Rust, Go)
- A deterministic artifact layout under `artifacts/<artifact>/<network>/`
- A manifest (`noirforge.json`) that records outputs, hashes, toolchain, and on-chain metadata
- SDK helpers (TypeScript + Rust) for building verification instruction data and submitting verify transactions

## Start here

- [Quickstart](/docs/getting-started/quickstart)
- [Local development environment](/docs/operations/local-development)
- [Devnet demo (hackathon gate)](/docs/getting-started/devnet-demo)
- [CLI configuration](/docs/cli/configuration)
- [Examples](/docs/examples)

## Core idea

NoirForge treats the artifact directory and its manifest as the boundary between:

- **Build/prove** steps (local toolchain)
- **Verify** steps (local and on-chain)

For on-chain verification, the verifier instruction payload is:

- `instruction_data = proof_bytes || public_witness_bytes`

## Safety posture

- Devnet-first by default.
- Mainnet operations are gated behind explicit opt-in (`--allow-mainnet`).
