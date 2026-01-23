---
title: prove
slug: commands/prove
---

`noirforge prove` generates a Groth16 proof (`.proof`) and public witness (`.pw`).

## Synopsis

```bash
noirforge prove \
  [--circuit-dir <path>] \
  [--artifact-name <name>] \
  [--out-dir <path>] \
  [--relative-paths-only] \
  [--witness-file <path>] \
  [--prover-name <name>] \
  [--witness-name <name>]
```

## What it runs

If needed:

- `nargo compile`
- `sunspot compile <acir_json>`
- `sunspot setup <ccs_file>`

Then:

- `nargo execute` (generates a witness `.gz` under the circuit `target/` dir)
- `sunspot prove <acir_json> <witness.gz> <ccs> <pk>`

## Outputs

Writes into `artifacts/<artifact_name>/local/`:

- `<name>.proof`
- `<name>.pw` (public witness)
- `Prover.toml` (if present in the circuit dir)
- updates `noirforge.json`

## Notes

- The private witness `.gz` is not copied into the artifacts directory.
- For on-chain verification, NoirForge constructs:
  - `instruction_data = proof_bytes || public_witness_bytes`
  - See `concepts/instruction-encoding`.
