---
title: rerun-prove
slug: commands/rerun-prove
---

`noirforge rerun-prove` regenerates a proof/public witness using the same stored inputs.

## Synopsis

```bash
noirforge rerun-prove --artifact-name <name> [--out-dir <path>]
```

## Behavior

- Loads `artifacts/<artifact_name>/local/noirforge.json`
- Copies `manifest.circuit_dir` into a temporary directory
- Restores `outputs.prover_toml` into the temp circuit as `Prover.toml`
- Runs `nargo execute` to regenerate a witness
- Runs `sunspot prove` using existing keys

## Outputs

Updates in `artifacts/<artifact_name>/local/`:

- `<name>.proof`
- `<name>.pw`
- `noirforge.json`
