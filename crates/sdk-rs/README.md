# noirforge-sdk

Rust helpers for NoirForge proof instruction encoding and Solana verify instruction construction.

## Add to Cargo.toml

```toml
[dependencies]
noirforge-sdk = "0.1.0-rc.2"
```

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

Repository: https://github.com/infantmen-labs/NoirForge
