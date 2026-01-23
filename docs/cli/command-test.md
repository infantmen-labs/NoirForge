---
title: test
slug: commands/test
---

`noirforge test` runs the Noir unit tests for a circuit using `nargo test`.

## Synopsis

```bash
noirforge test [--circuit-dir <path>]
```

## Inputs

- `--circuit-dir <path>`
  - Directory containing a Noir project.
  - Default: current working directory.

## What it runs

- `nargo test`

## Examples

```bash
pnpm noirforge test --circuit-dir /tmp/sum_a_b
```

## Notes

- This command does not write NoirForge artifacts. It validates circuit correctness.
