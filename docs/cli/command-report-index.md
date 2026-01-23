---
title: report-index
slug: commands/report-index
---

`noirforge report-index` reads a JSONL index file and prints aggregate metrics.

## Synopsis

```bash
noirforge report-index \
  [--artifact-name <name>] \
  [--out-dir <path>] \
  [--index-path <path>] \
  [--format <json|kv>]
```

## Inputs

- `--index-path <path>`
  - Default: `artifacts/<artifact>/local/noirforge-index.jsonl` (or `./noirforge-index.jsonl` if no artifact).
- `--format <json|kv>`
  - Default: `json`

## Output

- `json` (default): prints a JSON report.
- `kv`: prints a compact key/value report:
  - `verify_count`, `ok_count`, `err_count`, `ok_rate`
  - `compute_units_p50`, `compute_units_p95`
  - `index_lag_seconds_p50`, `index_lag_seconds_p95`

## Notes

- This command expects the index file to be newline-delimited JSON (one record per line).
