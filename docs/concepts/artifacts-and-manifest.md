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
