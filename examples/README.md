# Examples

This directory contains runnable examples that demonstrate how to use NoirForge artifacts and SDKs.

If you are looking for end-to-end examples of the Noir + Sunspot pipeline itself, see the templates under `templates/`.

## Examples

### `sdk-ts-verify-from-manifest/`

A minimal Node.js script that uses the TypeScript SDK to submit an on-chain verification transaction from a NoirForge `noirforge.json` manifest.

### `rust-sdk-instruction-data/`

A minimal Rust program that uses the Rust SDK to build `instruction_data = proof_bytes || public_witness_bytes`.
