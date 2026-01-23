# Artifacts and manifest

NoirForge writes build outputs into an artifact directory and records metadata in a manifest file.

## Artifact directory layout

Today, artifacts are written to:

- `artifacts/<artifact_name>/<network>/`

Common networks:

- `local`
- `devnet`

## Manifest file

The manifest is:

- `artifacts/<artifact_name>/<network>/noirforge.json`

It includes:

- `schema_version` (currently `1`)
- `name` (artifact name)
- `created_at`
- `circuit_dir`
- `proving_system` (currently `groth16`)
- `outputs` (paths and on-chain metadata)
- `outputs_rel` (paths relative to the artifact directory for portability)
- `hashes` (sha256 for key outputs)
- `toolchain` (parsed from repo `tool-versions`)

## Output resolution

For portability, prefer `--relative-paths-only` when writing artifacts. The CLI also stores `outputs_rel` which can be resolved relative to the artifact directory.

## On-chain metadata fields

After a deploy/verify flow, the manifest may include:

- `outputs.deployed_cluster`
- `outputs.deployed_program_id`
- `outputs.deployed_program_deploy_signature`
- `outputs.verify_onchain_cluster`
- `outputs.verify_onchain_program_id`
- `outputs.verify_onchain_signature`

## Manifest schema (high-level)

The CLI writes the following top-level fields:

- `schema_version`: currently `1`
- `name`: artifact name
- `created_at`: ISO timestamp
- `circuit_dir`: absolute path to the circuit directory (used by some commands like `rerun-prove`)
- `proving_system`: currently `groth16`
- `outputs`: a map of output names to paths (or metadata values)
- `outputs_rel`: a path-portable view of `outputs` (see below)
- `hashes`: sha256 for key outputs
- `toolchain`: parsed from repo `tool-versions`

The exact keys present depend on which CLI commands you run.

## `outputs` keys

Common keys written by the pipeline:

- `outputs.acir_json`: ACIR JSON file path
- `outputs.ccs`: CCS file path
- `outputs.pk`: proving key file path
- `outputs.vk`: verifying key file path
- `outputs.proof`: Groth16 proof file path
- `outputs.public_witness`: public witness file path
- `outputs.prover_toml`: copied `Prover.toml` file path (if present)

Deploy-related keys:

- `outputs.program_so`: built Solana program `.so` path
- `outputs.program_keypair`: built program keypair JSON path
- `outputs.program_id`: pubkey derived from `program_keypair`
- `outputs.built_program_so`, `outputs.built_program_keypair`, `outputs.built_program_id`: aliases of the build outputs

When deploying to a cluster (`noirforge deploy --cluster ...`):

- `outputs.deployed_cluster`
- `outputs.deployed_program_id`
- `outputs.deployed_program_deploy_signature`
- `outputs.deployed_program_upgrade_authority` (if the CLI can query it)

When submitting an on-chain verify transaction (`noirforge verify-onchain ...`):

- `outputs.verify_onchain_cluster`
- `outputs.verify_onchain_program_id`
- `outputs.verify_onchain_signature`

## `hashes` keys

The CLI uses sha256 hashes as a lightweight cache validator for generated outputs:

- `hashes.acir_json_sha256`
- `hashes.ccs_sha256`
- `hashes.pk_sha256`
- `hashes.vk_sha256`
- `hashes.proof_sha256`
- `hashes.public_witness_sha256`
- `hashes.prover_toml_sha256` (if `Prover.toml` is present)
- `hashes.program_so_sha256`
- `hashes.program_keypair_sha256`

## Caching behavior

`noirforge setup` supports a cache hit fast-path. It considers the cache valid when:

- The manifest exists and contains the required `outputs` and `hashes` keys.
- The referenced files exist.
- The sha256 of each required output matches the stored hash.

In that case, `setup` prints `cache_hit=true` and skips regeneration.

## Path portability: `--relative-paths-only` and `outputs_rel`

Artifact-writing commands support `--relative-paths-only`.

- When enabled, the CLI stores *relative* paths in `outputs`.
- When disabled, `outputs` may contain absolute paths, and `outputs_rel` will contain relative equivalents for any absolute paths.

Consumers should resolve paths by treating non-absolute paths as relative to the artifact directory.
