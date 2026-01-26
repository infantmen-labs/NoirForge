---
title: codegen
slug: commands/codegen
---

`noirforge codegen` generates TypeScript helper bindings for a deployed verifier program.

## Synopsis

```bash
noirforge codegen \
  --artifact-name <name> \
  [--out <dir>] \
  [--out-dir <path>] \
  [--anchor-idl]
```

## Inputs

- `--artifact-name` (required): artifact name.
- `--out-dir` (optional): artifact directory containing `noirforge.json`.
  - Default: `artifacts/<artifact_name>/local/`

## Outputs

Writes to the output directory (`--out`):

- `index.ts` (browser-safe helpers)
- `node.ts` (Node-only helpers that read proof/witness from disk)
- `README.md`
- `idl.json` (optional, only when `--anchor-idl` is set)

Default output directory:

- `bindings/<artifact_name>/`

## Instruction payload

The verifier instruction data is:

- `instruction_data = proof_bytes || public_witness_bytes`

See `concepts/instruction-encoding`.

## `--anchor-idl`

If you pass `--anchor-idl`, `noirforge codegen` also emits an Anchor-like `idl.json` stub.

Notes:

- This is a lightweight compatibility stub (not a full Anchor program).
- Accounts are empty (`[]`) because NoirForge/Sunspot verifier programs currently use no account inputs for the verify instruction.

## See also

- [Instruction encoding](/docs/concepts/instruction-encoding)
- [verify-onchain](/docs/cli/commands/verify-onchain)
