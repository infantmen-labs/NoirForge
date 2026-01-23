---
title: build
slug: commands/build
---

`noirforge build` is the convenience wrapper for the most common “get me keys” step.

## Synopsis

```bash
noirforge build \
  [--circuit-dir <path>] \
  [--artifact-name <name>] \
  [--out-dir <path>] \
  [--relative-paths-only]
```

## Behavior

- Same semantics as `setup`:
  - compile (ACIR + CCS) as needed
  - generate keys (`.pk`, `.vk`) as needed
- Writes outputs into `artifacts/<artifact_name>/local/`.

## Notes

- Use `compile` if you only want ACIR/CCS.
- Use `setup` if you want explicit key generation behavior.
