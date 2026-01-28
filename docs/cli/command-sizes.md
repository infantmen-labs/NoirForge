---
title: sizes
slug: commands/sizes
---

`noirforge sizes` prints proof/public-witness byte sizes for an artifact set, along with the derived verifier instruction payload size.

## Synopsis

```bash
noirforge sizes \
  --artifact-name <name> \
  [--out-dir <path>]
```

## Requirements

- The artifact directory must contain `noirforge.json`.
- The manifest must include `outputs.proof` and `outputs.public_witness` (or the corresponding `outputs_rel` entries).

## Output

Prints:

- `proof_bytes`
- `public_witness_bytes`
- `instruction_data_bytes` (computed as `proof_bytes + public_witness_bytes`)

It also prints the resolved file paths (`proof`, `public_witness`) and `manifest`.

## Example

```bash
pnpm noirforge sizes --artifact-name private_transfer_auth_from_template
```

You can also visualize sizes by uploading the `.proof` and `.pw` files into the docs-site `/metrics` page.

Example with an explicit artifact directory:

```bash
pnpm noirforge sizes --artifact-name private_transfer_auth_from_template --out-dir artifacts/private_transfer_auth_from_template/local
```
