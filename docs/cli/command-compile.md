---
title: compile
slug: commands/compile
---

`noirforge compile` compiles a Noir circuit to ACIR and then compiles ACIR to CCS.

## Synopsis

```bash
noirforge compile \
  [--circuit-dir <path>] \
  [--artifact-name <name>] \
  [--out-dir <path>] \
  [--relative-paths-only]
```

## What it runs

- `nargo compile`
- `sunspot compile <acir_json>`

## Outputs

Writes into `artifacts/<artifact_name>/local/`:

- `<name>.json` (ACIR)
- `<name>.ccs` (CCS)
- `noirforge.json` (manifest)

## Flags

- `--circuit-dir <path>`
  - Directory containing the Noir circuit.
- `--artifact-name <name>`
  - Artifact directory name.
  - Default is derived from the circuit directory name.
- `--out-dir <path>`
  - Override the root output directory.
- `--relative-paths-only`
  - Store relative paths in `noirforge.json.outputs` (portable artifacts).

## Notes

- For artifact/manifest semantics, see `concepts/artifacts-and-manifest`.
