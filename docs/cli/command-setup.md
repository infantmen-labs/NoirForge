---
title: setup
slug: commands/setup
---

`noirforge setup` generates Groth16 proving and verifying keys (`.pk`, `.vk`).

## Synopsis

```bash
noirforge setup \
  [--circuit-dir <path>] \
  [--artifact-name <name>] \
  [--out-dir <path>] \
  [--relative-paths-only]
```

## What it runs

If needed:

- `nargo compile`
- `sunspot compile <acir_json>`
- `sunspot setup <ccs_file>`

## Outputs

Writes into `artifacts/<artifact_name>/local/`:

- `<name>.pk`
- `<name>.vk`
- updates `noirforge.json`

## Caching

If `noirforge.json` already contains key outputs and matching sha256 hashes, `setup` can skip regeneration.

## Flags

- `--relative-paths-only`
  - Store relative paths in `noirforge.json.outputs`.
