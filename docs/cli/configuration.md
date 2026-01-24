# CLI configuration

This page documents CLI-wide configuration knobs that apply to multiple commands.

## Observability

The CLI can emit structured JSON events.

Enable via environment variables:

- `NOIRFORGE_OBS_LOG=1`: emit JSON events to stderr
- `NOIRFORGE_OBS_EVENTS_PATH=<path>`: append JSON events to a JSONL file

Or override via flags (when supported by the command):

- `--obs-log <0|1>`
- `--obs-events-path <path>`

The event stream includes:

- `cli_cmd_start` / `cli_cmd_end` (with `duration_ms`)
- `exec_start` / `exec_end` for external tools (`nargo`, `sunspot`, `solana`, etc.)
- `rpc_attempt_start` / `rpc_attempt_end` for RPC calls (with endpoint + attempt + duration)

## RPC and websocket configuration

On-chain commands support selecting RPC and websocket endpoints.

Commands that use RPC/WS include:

- `verify-onchain`
- `simulate-onchain`
- `tx-stats`
- `index-tx`
- `index-program`

### Provider selection

Use `--rpc-provider <default|quicknode|helius>` or `NOIRFORGE_RPC_PROVIDER`.

- `default`: uses the cluster-derived Solana RPC URL (or `http://127.0.0.1:8899` for localnet)
- `quicknode`: uses the QuickNode endpoint bundle
- `helius`: uses the Helius endpoint bundle

The provider selection is only used when you do not provide explicit endpoints.

### Explicit endpoint override

Explicit endpoints override provider selection:

- `--rpc-url <url>` or `NOIRFORGE_RPC_URL`
- `--rpc-endpoints <csv>` or `NOIRFORGE_RPC_ENDPOINTS`

Websocket overrides:

- `--ws-url <url>` or `NOIRFORGE_WS_URL`
- `--ws-endpoints <csv>` or `NOIRFORGE_WS_ENDPOINTS`

### Provider-specific environment variables

QuickNode:

- `NOIRFORGE_QUICKNODE_RPC_URL`
- `NOIRFORGE_QUICKNODE_RPC_ENDPOINTS`
- `NOIRFORGE_QUICKNODE_WS_URL`
- `NOIRFORGE_QUICKNODE_WS_ENDPOINTS`

Helius:

- Recommended (single setting):
  - `NOIRFORGE_HELIUS_API_KEY`

- `NOIRFORGE_HELIUS_RPC_URL`
- `NOIRFORGE_HELIUS_RPC_ENDPOINTS`
- `NOIRFORGE_HELIUS_WS_URL`
- `NOIRFORGE_HELIUS_WS_ENDPOINTS`

### Failover and retries

When multiple endpoints are provided, the CLI will:

- retry a small number of times
- rotate through endpoints on failure
- apply backoff (with extra delay when it detects rate limiting)

## Helius Enhanced Transactions (indexing)

`index-tx` supports optional Helius Enhanced Transactions indexing.

Enable via:

- `--helius-enhanced <0|1>` or `NOIRFORGE_HELIUS_ENHANCED=1`

Provide an API key via:

- `--helius-api-key <key>` or `NOIRFORGE_HELIUS_API_KEY=<key>`

When enabled, `index-tx` appends a `kind=tx_enhanced` record to the JSONL index file.

For guidance on handling provider credentials and logs, see `security/secrets-and-credentials`.
