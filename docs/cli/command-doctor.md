---
title: doctor
slug: commands/doctor
---

`noirforge doctor` checks whether your environment satisfies the minimum requirements to run NoirForge.

## Synopsis

```bash
noirforge doctor
```

## What it checks

- `nargo --version` is available on `PATH`
- `sunspot --help` is available on `PATH`
- `go version` is available and Go is **>= 1.24**
- `GNARK_VERIFIER_BIN` is set and points to an existing directory

## Output

- Prints `OK` on success.
- Prints `NOT OK` and one or more `issue=<...>` lines on failure.

## Notes

- `GNARK_VERIFIER_BIN` is required for `noirforge deploy`.
- For common setup issues, see `troubleshooting`.
