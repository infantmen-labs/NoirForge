# Rust SDK

Crate:

- `noirforge-sdk`

## Add to Cargo.toml

```toml
[dependencies]
noirforge-sdk = "0.1.0-rc.3"
```

## What it does

The Rust SDK provides helpers for programs/clients that need to construct or parse the verifier instruction payload.

Key helpers:

- `build_instruction_data(proof_bytes, public_witness_bytes)`
- `build_verify_instruction(program_id, proof_bytes, public_witness_bytes)`
- `parse_public_witness(public_witness_bytes)`
- `split_instruction_data(instruction_data, public_witness_len)`

Related types:

- `PublicWitness`
- `DecodeError`

## Example

```rust
use noirforge_sdk::{build_instruction_data, build_verify_instruction};
use solana_program::pubkey::Pubkey;

let program_id = Pubkey::new_unique();
let proof = vec![1u8, 2, 3];
let public_witness = vec![4u8, 5];

let data = build_instruction_data(&proof, &public_witness);
let ix = build_verify_instruction(program_id, &proof, &public_witness);
assert_eq!(ix.data, data);
```
