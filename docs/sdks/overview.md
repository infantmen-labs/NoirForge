# SDKs overview

NoirForge provides SDKs for applications that need to:

- load NoirForge manifests
- read proof/public witness bytes
- construct `instruction_data = proof_bytes || public_witness_bytes`
- submit Solana verification transactions

## TypeScript SDK

Package:

- `@noirforge/sdk`

Docs:

- `sdks/typescript`

## Rust SDK

Crate:

- `noirforge-sdk`

Docs:

- `sdks/rust`

## SDK policy

- SDKs do **not** hardcode canonical mainnet program ids.
- You must provide a `programId` explicitly or rely on manifest outputs.

The CLI remains the source of truth for artifact layout and manifest semantics.
