# Indexing and observability

NoirForge includes lightweight observability hooks and a JSONL-based indexing format.

## Structured CLI observability

The CLI can emit structured JSON events for command execution and RPC behavior.

Enable via environment variables:

- `NOIRFORGE_OBS_LOG=1`: emit JSON events to stderr
- `NOIRFORGE_OBS_EVENTS_PATH=<path>`: append JSON events to a JSONL file

Or via CLI flags (override env):

- `--obs-log <0|1>`
- `--obs-events-path <path>`

### Event kinds

Common event shapes:

- `kind=cli_cmd_start`
  - `cmd`
  - `at`
- `kind=cli_cmd_end`
  - `cmd`
  - `at`
  - `ok`
  - `duration_ms`

External tool spans:

- `kind=exec_start` / `kind=exec_end`
  - `span_id`
  - `tool`
  - `args` (with API keys redacted)
  - `cwd`
  - `ok`, `status`, `duration_ms`

RPC attempt spans (with endpoint failover and retry/backoff):

- `kind=rpc_attempt_start` / `kind=rpc_attempt_end`
  - `span_id`
  - `op` (e.g. `getTransaction`, `getSignaturesForAddress`)
  - `attempt`
  - `endpoint`
  - `ok`, `duration_ms`, `error`

## JSONL index format

The CLI indexing commands append newline-delimited JSON records to an index file.

Default path:

- `<artifact_dir>/noirforge-index.jsonl`

You can override it with `--index-path <path>`.

### Record: `kind=tx`

A normalized transaction record:

- `kind`: `tx`
- `fetched_at`: ISO timestamp
- `signature`
- `cluster`
- `rpc_endpoint`
- `slot`
- `block_time`
- `fee_lamports`
- `compute_units`
- `err`

### Record: `kind=noirforge_verify`

When a transaction contains one or more instructions targeting a verifier program id, the CLI may append a second record describing the verifier instruction payload(s):

- `kind`: `noirforge_verify`
- `fetched_at`: ISO timestamp
- `signature`
- `cluster`
- `rpc_endpoint`
- `slot`
- `block_time`
- `program_id`
- `artifact_name` (when known)
- `manifest_name` (when known)
- `ok` (derived from transaction `meta.err`)
- `err`
- `fee_lamports`
- `compute_units`
- `verify_instruction_count`
- `instruction_data_len`

### Record: `kind=tx_enhanced`

When Helius Enhanced Transactions are enabled, `index-tx` appends an additional record containing the raw provider response:

- `kind`: `tx_enhanced`
- `fetched_at`
- `provider`: `helius`
- `signature`
- `cluster`
- `data`: raw JSON response

Helius Enhanced is optional and requires an API key:

- `--helius-enhanced <0|1>` or `NOIRFORGE_HELIUS_ENHANCED=1`
- `--helius-api-key <key>` or `NOIRFORGE_HELIUS_API_KEY=<key>`

## Commands

- `noirforge index-tx`: index a single transaction signature
- `noirforge index-program`: fetch recent signatures for a program id, then index each transaction
- `noirforge report-index`: summarize a JSONL index file (primarily `noirforge_verify` records)

`report-index` can print:

- JSON (default): one JSON object with `kind=noirforge_index_report`
- KV: `key=value` lines (useful for piping into scripts)

The report includes percentile summaries for:

- `compute_units`
- `fee_lamports`
- `instruction_data_len`
- `index_lag_seconds` (derived from `fetched_at - block_time` when available)

## Compute history (JSONL)

`noirforge compute-analyze` appends per-run simulation records to a separate JSONL history file:

- `<artifact_dir>/noirforge-compute.jsonl`

Each record includes:

- `kind=noirforge_simulate`
- `simulated_at`
- `cluster`
- `program_id`
- `cu_limit`
- `compute_units_consumed` (when available)
- `ok` / `err`

You can visualize:

- `noirforge-compute.jsonl` (compute history)
- `.proof`/`.pw` sizes

in the docs-site `/metrics` page.
