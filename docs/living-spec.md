# NoirForge — Living Spec

This file is a rough, continuously-updated specification of what exists in the repo today.

## Scope

NoirForge currently provides a minimal, reproducible wrapper around the Noir + Sunspot pipeline:

- Compile Noir circuits to ACIR (`.json`)
- Compile ACIR to CCS (`.ccs`)
- Generate Groth16 keys (`.pk` / `.vk`)
- Generate Groth16 proof + public witness (`.proof` / `.pw`)
- Verify proof locally
- Build a Solana verifier program (`.so`) + keypair json from a verifying key

## Environment

- You must run this inside WSL2/Linux.
- Toolchain versions are pinned in `tool-versions`.

Important environment variables:

- `GNARK_VERIFIER_BIN`
  - Required for `sunspot deploy` / `noirforge deploy`
  - Must point to the Rust crate directory used by Sunspot for `cargo build-sbf`.

Dockerized (Phase 7.4):

- A repo-root `Dockerfile` provides a pinned toolchain environment for reproducible runs.
- Build:
  - `docker build -t noirforge-dev .`
- Run:
  - `docker run --rm -it -v "$PWD:/workspace" noirforge-dev`
- Versions are pinned to match `tool-versions` via Docker build args.

## Repo / packages

- CLI: `packages/cli/bin/noirforge.js`
- TypeScript SDK (WIP): `packages/sdk-ts`
  - Example: `node packages/sdk-ts/examples/verify-from-manifest.js --manifest <path/to/noirforge.json>`
- Rust SDK (WIP): `crates/sdk-rs` (`noirforge-sdk`)
- Artifacts: `artifacts/<artifact_name>/<network>/...` (today we use `network=local`)

## Tests

- CLI unit tests: `pnpm -C packages/cli test`
- CLI integration tests (local pipeline): `pnpm -C packages/cli test:integration`
- CLI devnet E2E tests (triggered): `NOIRFORGE_E2E_DEVNET=1 pnpm -C packages/cli test:e2e:devnet`
  - Uses local payer keypair: `~/.config/solana/id.json`
  - Cross-validates `verify-local` and `verify-onchain` both succeed for the same artifacts
- sdk-ts unit tests: `pnpm -C packages/sdk-ts test`
- CI: `.github/workflows/node.yml`, `.github/workflows/rust.yml`
  - Node CI installs `nargo` and `sunspot` so CLI integration tests should run without skipping.
  - Supply chain: `.github/workflows/security.yml`, `.github/workflows/release.yml`
    - `security.yml`: dependency review on PRs + SBOM artifact generation
    - `release.yml`: tag-triggered release artifacts + provenance attestation (CLI tarball, sdk-ts tarball, Rust crate, SBOM)

## CLI commands

All commands are available via:

- `pnpm noirforge <command> ...`

Notes:

- `noirforge` wraps `nargo` and surfaces captured stdout/stderr when `nargo` fails.
- Use `--relative-paths-only` on artifact-writing commands (`compile`, `setup`, `prove`, `deploy`) to store relative paths in `noirforge.json.outputs`.
- Observability (CLI):
  - `NOIRFORGE_OBS_LOG=1` enables structured JSON logs to stderr.
  - `NOIRFORGE_OBS_EVENTS_PATH=<path>` appends JSONL events.
  - CLI flags override env:
    - `--obs-log <0|1>`
    - `--obs-events-path <path>`
  - Events include:
    - `kind=cli_cmd_start` / `kind=cli_cmd_end` (includes `duration_ms`)
    - `kind=exec_start` / `kind=exec_end` for external commands (`nargo`, `sunspot`, `solana`, etc.)
    - `kind=rpc_attempt_start` / `kind=rpc_attempt_end` for RPC attempts (includes `endpoint`, `attempt`, `duration_ms`, `ok`, and `op`)
- On-chain commands (`verify-onchain`, `simulate-onchain`, `tx-stats`) support RPC provider settings:
  - `--rpc-provider <default|quicknode|helius>` (select endpoint bundle)
  - `--rpc-url <url>` (single endpoint)
  - `--rpc-endpoints <csv>` (comma-separated endpoints for failover)
  - `--ws-url <url>` (single websocket endpoint override)
  - `--ws-endpoints <csv>` (comma-separated websocket endpoints for failover)
  - `NOIRFORGE_RPC_URL` / `NOIRFORGE_RPC_ENDPOINTS` env vars
  - `NOIRFORGE_WS_URL` / `NOIRFORGE_WS_ENDPOINTS` env vars
  - `NOIRFORGE_RPC_PROVIDER` env var
  - `NOIRFORGE_HELIUS_API_KEY` env var (recommended for `rpc-provider=helius`; auto-derives RPC/WS endpoints)
  - `NOIRFORGE_QUICKNODE_RPC_URL` / `NOIRFORGE_QUICKNODE_RPC_ENDPOINTS` env vars
  - `NOIRFORGE_HELIUS_RPC_URL` / `NOIRFORGE_HELIUS_RPC_ENDPOINTS` env vars
  - `NOIRFORGE_QUICKNODE_WS_URL` / `NOIRFORGE_QUICKNODE_WS_ENDPOINTS` env vars
  - `NOIRFORGE_HELIUS_WS_URL` / `NOIRFORGE_HELIUS_WS_ENDPOINTS` env vars
  - Default is derived from `--cluster` (devnet/testnet/mainnet-beta/localhost or custom url)
  - Precedence: explicit `--rpc-url`/`--rpc-endpoints` (or `NOIRFORGE_RPC_URL`/`NOIRFORGE_RPC_ENDPOINTS`) overrides provider selection.
  - Requests use retry + backoff, basic rate-limit handling, and endpoint failover.

- Indexing command (`index-tx`) appends normalized transaction metadata to a JSONL file:
  - `--index-path <path>` (default: `<artifact_dir>/noirforge-index.jsonl`)
  - Same RPC/WS provider settings as on-chain commands
  - Optional (Helius Enhanced Transactions) behind flags:
    - `--helius-enhanced <0|1>` or `NOIRFORGE_HELIUS_ENHANCED=1`
    - `--helius-api-key <key>` or `NOIRFORGE_HELIUS_API_KEY=<key>`
    - When enabled, appends an additional JSONL record with `kind=tx_enhanced` containing the raw Helius response.
  - Each line is a JSON object with fields:
    - `kind` (`tx`)
    - `fetched_at` (ISO timestamp)
    - `signature`
    - `cluster`
    - `rpc_endpoint`
    - `slot`
    - `block_time`
    - `fee_lamports`
    - `compute_units`
    - `err`

  - When the transaction contains at least one instruction targeting the deployed verifier program, `index-tx` may append an additional JSONL record with `kind=noirforge_verify`.
  - Fields:
    - `kind` (`noirforge_verify`)
    - `fetched_at` (ISO timestamp)
    - `signature`
    - `cluster`
    - `rpc_endpoint`
    - `slot`
    - `block_time`
    - `program_id`
    - `artifact_name`
    - `manifest_name`
    - `ok`
    - `err`
    - `fee_lamports`
    - `compute_units`
    - `verify_instruction_count`
    - `instruction_data_len`

- Indexing command (`index-program`) fetches recent transactions for a verifier `program-id` and appends JSONL records:
  - Uses Solana RPC `getSignaturesForAddress` to fetch a signature list.
  - For each signature, fetches the transaction and appends:
    - `kind=tx` record
    - `kind=noirforge_verify` record (only if the tx contains at least one instruction targeting the verifier program)
  - Inputs:
    - `--program-id <pubkey>` (required unless it can be inferred from `noirforge.json.outputs`)
    - `--limit <n>` (default: 100)
    - `--before <sig>` / `--until <sig>` for pagination bounds
    - `--index-path <path>` (default: `<artifact_dir>/noirforge-index.jsonl`)

- Reporting command (`report-index`) summarizes a JSONL index file (primarily `noirforge_verify` records):
  - `--index-path <path>` (default: `<artifact_dir>/noirforge-index.jsonl`)
  - Output:
    - Default (`--format json`): prints a single JSON object (includes `kind=noirforge_index_report`).
    - `--format kv`: prints `key=value` lines for the top-level summary and percentiles.
  - Includes `index_lag_seconds` stats when `block_time` and `fetched_at` are present.

## Webhooks receiver (Phase 6.2)

Minimal receiver service lives in `packages/webhooks`.

Run:

- `pnpm -C packages/webhooks start`

Configuration:

- `NOIRFORGE_WEBHOOK_PROVIDER=quicknode|helius`
- `NOIRFORGE_WEBHOOK_HOST` (default `127.0.0.1`)
- `NOIRFORGE_WEBHOOK_PORT` (default `8787`)
- `NOIRFORGE_WEBHOOK_PATH` (default `/webhook`)
- `NOIRFORGE_WEBHOOK_EVENTS_PATH` (optional JSONL sink for accepted events)
- `NOIRFORGE_WEBHOOK_DLQ_PATH` (optional JSONL sink for errors)
- Observability (webhooks):
  - `NOIRFORGE_WEBHOOK_OBS_LOG=1` enables structured JSON logs to stderr.
  - `NOIRFORGE_WEBHOOK_OBS_EVENTS_PATH=<path>` appends JSONL events (one per request) with `kind=webhook_req`.

QuickNode verification:

- `NOIRFORGE_QN_WEBHOOK_SECRET` (Stream/Webhook security token)
- Expects `X-QN-Nonce`, `X-QN-Timestamp`, `X-QN-Signature` headers

Helius verification:

- `NOIRFORGE_HELIUS_WEBHOOK_AUTHORIZATION` (expected `Authorization` header value)

### `noirforge init`

Runs:

- Copies a template from `./templates/<template>` into a destination directory

Behavior:

- `noirforge init` (no args) lists available templates
- `noirforge init <template> [dest]` copies the template to `dest` (default `./<template>`)

Current templates:

- `sum_a_b`
- `zk_gated_access_control`
- `anonymous_voting`
- `selective_disclosure`
- `private_transfer_authorization`

### `noirforge compile`

Runs:

- `nargo compile`
- `sunspot compile <acir_json>`

Writes to `artifacts/<artifact_name>/local/`:

- `<name>.json` (ACIR)
- `<name>.ccs` (CCS)
- `noirforge.json` (manifest)

### `noirforge build`

Runs:

- Same semantics as `noirforge setup` (compile + ccs + pk/vk as needed)

This is intended as a convenience wrapper for the most common “get me keys” build step.

### `noirforge setup`

Runs (if needed):

- `nargo compile`
- `sunspot compile <acir_json>`
- `sunspot setup <ccs_file>`

Writes to `artifacts/<artifact_name>/local/`:

- `<name>.pk`
- `<name>.vk`
- Updates `noirforge.json`

Caching:

- If `noirforge.json` already contains `outputs.{acir_json,ccs,pk,vk}` and matching sha256 hashes, `noirforge setup` will skip regeneration.

### `noirforge prove`

Runs (if needed):

- `nargo compile`
- `sunspot compile <acir_json>`
- `sunspot setup <ccs_file>`
- `nargo execute` (generates a witness `.gz` in the circuit `target/` dir)
- `sunspot prove <acir_json> <witness.gz> <ccs> <pk>`

Writes to `artifacts/<artifact_name>/local/`:

- `<name>.proof`
- `<name>.pw` (public witness)
- `Prover.toml` (if present in the circuit dir)
- Updates `noirforge.json`

Note:

- The private witness `.gz` is *not* copied into the artifacts directory.

### `noirforge rerun-prove`

Replays proving with the same witness inputs by:

- Loading `artifacts/<artifact_name>/local/noirforge.json`
- Copying `manifest.circuit_dir` into a temporary directory
- Restoring `outputs.prover_toml` into the temp circuit as `Prover.toml`
- Running `nargo execute` to regenerate a witness
- Running `sunspot prove` using the existing keys

Writes to `artifacts/<artifact_name>/local/`:

- Updates `<name>.proof` and `<name>.pw`
- Updates `noirforge.json`

### `noirforge test`

Runs:

- `nargo test`

### `noirforge verify-local`

Runs:

- `sunspot verify <vk> <proof> <public_witness>`

Inputs are resolved from `artifacts/<artifact_name>/local/noirforge.json`.

### `noirforge verify-onchain`

Runs:

- Submits a Solana transaction that invokes the deployed verifier program
- Instruction data is: `instruction_data = proof_bytes || public_witness_bytes`

Requirements:

- `outputs.deployed_program_id` must exist in the manifest (run `noirforge deploy --cluster devnet` first)
- Uses `@solana/web3.js` internally

Defaults:

- Cluster defaults to `outputs.deployed_cluster` or `devnet`
- Payer defaults to `~/.config/solana/id.json` (override with `--payer <path>`)

Outputs recorded in the manifest:

- `outputs.verify_onchain_cluster`
- `outputs.verify_onchain_program_id`
- `outputs.verify_onchain_signature`

### `noirforge simulate-onchain`

Runs:

- Simulates a Solana transaction that invokes the deployed verifier program (does not submit a transaction)
- Instruction data is: `instruction_data = proof_bytes || public_witness_bytes`

Requirements:

- `outputs.deployed_program_id` must exist in the manifest (run `noirforge deploy --cluster devnet` first)

Behavior:

- Prints simulation logs to stdout
- Prints a short key/value summary including `cluster`, `program_id`, and `compute_units_consumed` when available
- Exits non-zero if the simulation returns an error
- Does not update the manifest

### `noirforge sizes`

Prints byte sizes for key verifier inputs derived from an artifact manifest:

- `proof_bytes`
- `public_witness_bytes`
- `instruction_data_bytes` (computed as `proof_bytes + public_witness_bytes`)

### `noirforge compute-analyze`

Runs `simulateTransaction` for the deployed verifier program, extracts `compute_units_consumed` when available, and appends a JSONL record.

Defaults:

- History path: `artifacts/<artifact_name>/local/noirforge-compute.jsonl`

### `noirforge tx-stats`

Runs:

- Fetches a transaction by signature and prints basic metadata

Inputs:

- `--signature <sig>` OR
- `--artifact-name <name>` (uses `artifacts/<name>/local/noirforge.json`)

Defaults:

- Signature defaults to `outputs.verify_onchain_signature` (fallback: `outputs.deployed_program_deploy_signature`)
- Cluster defaults to `outputs.verify_onchain_cluster` (fallback: `outputs.deployed_cluster` or `devnet`)

Outputs:

- `fee_lamports`
- `compute_units` (when available)
- `err` (when present)

### `noirforge bench`

Runs:

- Times the local pipeline by running:
  - `noirforge build`
  - `noirforge prove`
  - `noirforge verify-local`

Optional:

- With `--cluster <...>` it will also run:
  - `noirforge deploy --cluster <...>`
  - `noirforge verify-onchain --cluster <...>`
  - `noirforge tx-stats --cluster <...>`

Outputs:

- `build_ms`, `prove_ms`, `verify_local_ms`
- If `--cluster` is used: `deploy_ms`, `verify_onchain_ms`, `tx_stats_ms`

### `noirforge flow`

Runs a single end-to-end “ZK flow harness” for a circuit.

Runs:

- Optional: `noirforge init <template> <dest>` (when `--template` is provided)
- `noirforge test`
- `noirforge build`
- `noirforge prove`
- `noirforge verify-local`

Optional:

- With `--cluster <...>` it will also run:
  - `noirforge deploy --cluster <...>`
  - `noirforge verify-onchain --cluster <...>`
  - `noirforge tx-stats --cluster <...>`

Outputs:

- `test_ms`, `build_ms`, `prove_ms`, `verify_local_ms`
- If `--template` is used: `template`, `dest`, `init_ms`
- If `--cluster` is used: `deploy_ms`, `verify_onchain_ms`, `tx_stats_ms`

### `noirforge deploy`

Runs:

- `sunspot deploy <vk>`

This builds a Solana BPF program via `cargo build-sbf` inside the `GNARK_VERIFIER_BIN` crate.

Outputs are written by Sunspot into the same directory as the `.vk` file.

NoirForge expects and records:

- `<name>.so`
- `<name>-keypair.json`

NoirForge also records the *locally built* program id by running:

- `solana-keygen pubkey <name>-keypair.json`

Important:

- By default (no `--cluster`), this only builds the verifier program artifact.
- With `--cluster <...>`, NoirForge will additionally run `solana program deploy` and record deployment metadata.
  - Optional flags when `--cluster` is provided:
    - `--upgrade-authority <keypair.json>` sets an explicit upgrade authority for the deployed program.
    - `--final` deploys the program as immutable (no upgrade authority).

Manifest semantics:

- `outputs.built_program_id` is the pubkey derived from the generated keypair.
- `outputs.built_program_so` and `outputs.built_program_keypair` point to the local build outputs.
- `outputs.program_id` / `outputs.program_so` / `outputs.program_keypair` currently mirror the built-program fields for backward compatibility.
- When `--cluster` is provided:
  - `outputs.deployed_cluster` is the Solana cluster/url that was used
  - `outputs.deployed_program_id` is the deployed program id (typically equal to `built_program_id`)
  - `outputs.deployed_program_deploy_signature` is the deployment transaction signature (when available)
  - `outputs.deployed_program_upgrade_authority` is recorded when available (queried via `solana program show`).

### `noirforge doctor`

Checks the environment is sane:

- `nargo` exists
- `sunspot` exists
- `go version` is >= 1.24
- `GNARK_VERIFIER_BIN` is set and points to an existing directory

## Artifacts + manifest

Artifacts are written to:

- `artifacts/<artifact_name>/local/`

`noirforge.json` currently contains:

- `schema_version` (currently `1`)
- `name`
- `created_at`
- `circuit_dir`
- `proving_system` (currently `groth16`)
- `outputs` (absolute paths to generated artifacts by default; may be relative if `--relative-paths-only` was used)
- `outputs_rel` (paths relative to the artifact directory for portability; mirrors `outputs` when `outputs` are already relative)
- `hashes` (sha256 for key outputs)
- `toolchain` (parsed from repo `tool-versions`)

## Solana instruction encoding spec (current verifier)

The verifier program produced by Sunspot (based on `gnark-solana/crates/verifier-bin`) expects:

- `instruction_data = proof_bytes || public_witness_bytes`

There are no accounts required by the verifier program (empty `accounts` array is valid).

### `public_witness_bytes` format

From `gnark-solana/crates/verifier-lib/src/witness.rs`:

- Total length must be: `12 + NR_INPUTS * 32`
- First 12 bytes are a header (ignored by the verifier other than for total-length checking)
- Followed by `NR_INPUTS` entries of 32 bytes each

Witness entry encoding:

- Each entry is interpreted as a 32-byte **big-endian** integer (field element).

`NR_INPUTS` is taken from the verifying key embedded in the program:

- `NR_INPUTS = generated_vk::VK.nr_pubinputs`

### `proof_bytes` format

From `gnark-solana/crates/verifier-lib/src/proof.rs`:

The proof is parsed as:

- `A` (G1): 64 bytes
- `B` (G2): 128 bytes
- `C` (G1): 64 bytes
- `num_commitments` (u32, **big-endian**): 4 bytes
- `commitments`: `num_commitments * 64` bytes (each commitment is 64 bytes)
- `commitment_pok`: 64 bytes

So:

- `proof_len = 256 + 4 + num_commitments*64 + 64`
- For circuits with no commitments: `num_commitments = 0` and `proof_len = 324`

### Constructing instruction data

Given the `.proof` and `.pw` files generated by Sunspot:

- Read both files as raw bytes
- Concatenate `proof_bytes` followed by `pw_bytes`
- Send as Solana instruction data to the verifier program

The upstream verifier-bin tests do exactly this concatenation.

## Cryptographic / protocol assumptions (Phase 7.2)

- Proof system is currently **Groth16**.
- Groth16 requires a **trusted setup**. NoirForge does not attempt to verify the ceremony provenance; it treats proving/verifying keys generated by Sunspot as trusted inputs.
- The on-chain verifier program embeds a verifying key; correctness depends on:
  - The verifying key used for `sunspot deploy` matching the proving key used for proof generation.
  - The deployed program id corresponding to the intended verifier artifact.
- NoirForge’s client-side on-chain verification payload is strictly:
  - `instruction_data = proof_bytes || public_witness_bytes`
  - No accounts are required by the verifier instruction.
- Transaction parsing/indexing (RPC or Helius enhanced) is for observability and UX; it is not a cryptographic verification.

## Sunspot risk mitigation (Phase 7.3)

- Sunspot is treated as a **high-risk dependency**.
- CI installs Sunspot from source at a **pinned commit**: `8e61988da7b35add0e1384962f46c46b367235c1`.
- Recommended policy:
  - Keep Sunspot pinned in CI and local dev.
  - Only change the pinned commit intentionally (explicit review + testing).
  - Prefer minimum-scope upgrades and record the pin change in the roadmap.

Verifier generation / deploy review checklist:

- Confirm `GNARK_VERIFIER_BIN` points to the expected `verifier-bin` crate directory.
- Confirm the `.vk` used for `sunspot deploy` is the intended one for the circuit build.
- After `noirforge deploy --cluster ...`, confirm:
  - `outputs.deployed_program_id` matches the expected program id.
  - `outputs.deployed_program_upgrade_authority` matches the intended governance (or is absent when `--final` was used).
- If possible, run a devnet smoke test:
  - `noirforge verify-onchain` succeeds using the deployed program.

Third-party audit scope (draft):

- Focus areas:
  - Verifier artifact generation pipeline (`sunspot deploy` → `.so` + keypair)
  - Instruction encoding + parsing (proof/public witness layout and length checks)
  - Deployment controls (upgrade authority, immutability)
  - CI pinning/reproducibility (pinned toolchain + SBOM)
- Deliverables:
  - Findings report with severity ratings
  - Recommended mitigations and follow-up test cases

Contingency / alternatives (draft):

- If Sunspot becomes a blocker, evaluate:
  - Fork + vendor the critical verifier generation components (pin and audit a dedicated fork)
  - Alternative verifier stacks with Solana-compatible program output
  - Alternative proof systems / prover toolchains (requires reworking templates and verifier program)
- Selection criteria:
  - Security posture (audits, maturity)
  - Determinism/reproducibility
  - Solana program size/compute constraints
  - Ecosystem support and maintenance cost

## Open questions / TODO

- Manifests can include absolute paths (default) or relative paths via `--relative-paths-only`.
