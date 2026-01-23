---
title: verify-local
slug: commands/verify-local
---

`noirforge verify-local` checks a proof against a verifying key using `sunspot verify`.

## Synopsis

```bash
noirforge verify-local [--artifact-name <name>] [--out-dir <path>]
```

## What it runs

- `sunspot verify <vk> <proof> <public_witness>`

Inputs are resolved from `artifacts/<artifact_name>/local/noirforge.json`.

## Notes

- Prefer `verify-local` during development to catch issues before any on-chain step.
