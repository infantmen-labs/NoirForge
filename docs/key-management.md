# Key management policy

This document describes the recommended practices for managing keys and secrets when using NoirForge.

This is a policy document, not an operational runbook. It intentionally avoids including any private key material, provider credentials, or environment-specific secrets.

## Scope

In scope:

- Local Solana payer keypairs used to sign transactions.
- Program deployment keypairs and upgrade authority keypairs.
- CI and release secrets (tokens, signing keys, provider credentials).

Out of scope:

- End-user wallet custody/security (outside of NoirForge CLI/SDK).

## Key categories

### Payer keypair (transaction signer)

- Used for:
  - `verify-onchain`
  - `simulate-onchain` (if sending/signing)
  - `deploy` (pays deployment fees)
- Default path (CLI/docs): `~/.config/solana/id.json`.

### Program keypair (program id)

- Used for:
  - creating the program id (via `solana-keygen pubkey`)
  - deploying the verifier program `.so`

### Upgrade authority keypair

- Used for:
  - controlling upgrades (when the program is mutable)
  - emergency rollbacks (upgrade to a fixed program)

On mainnet, upgrade authority must be treated as a high-sensitivity key.

### CI / release secrets

Examples:

- Credentials used to publish release artifacts.
- Signing keys used to create provenance attestations.
- Provider credentials (RPC/webhook services), if applicable.

## Rules (hard requirements)

- No keypairs are ever committed to the repo.
- No `.env` files with secrets are committed.
- No secrets are printed in logs.
- CI secrets must be stored only in the CI secret store.

## Recommended practices

### Development (local)

- Use a dedicated devnet payer keypair.
- Prefer keeping devnet keys ephemeral:
  - rotate frequently
  - do not re-use on mainnet
- Treat artifact directories as build outputs:
  - do not place secrets inside artifact directories
  - avoid sharing artifacts publicly unless you have reviewed the manifest contents

### Devnet deploys

- Use a deployer keypair funded only for devnet operations.
- Use `--final` when you want to prevent accidental upgrades during testing.
- If you need upgrades, use `--upgrade-authority <keypair.json>` and keep authority separate from the payer.

### Mainnet deploys

- Mainnet operations must be intentional:
  - NoirForge requires `--allow-mainnet` for `--cluster mainnet-beta`.
- Prefer immutable deployments (`--final`) for releases.
- If mutable deployment is required:
  - use an explicit upgrade authority
  - prefer a multisig/timelock-controlled authority
  - separate responsibilities:
    - payer keypair for fees
    - authority keypair for upgrades

## Secret storage

- Local keys:
  - store only on trusted developer machines
  - protect with OS-level encryption (full disk encryption)
  - back up only using encrypted storage
- CI secrets:
  - store only in the CI secret manager
  - restrict access to maintainers
  - scope tokens minimally (least privilege)

## Rotation and incident response

- Rotate devnet keys on a regular cadence.
- If any mainnet authority key is suspected compromised:
  - immediately halt deployments
  - if program is mutable and you control authority, upgrade to a fixed version and rotate authority
  - if program is immutable, deploy a new program id and deprecate the old id

## Related documents

- `docs/threat-model.md`
- `docs/mainnet-runbook.md` (internal)
- `docs/troubleshooting.md`
