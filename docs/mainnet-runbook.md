# Mainnet runbook (internal)

This is an internal checklist for deploying and operating NoirForge verifier programs on `mainnet-beta`.

## Scope

- Deployment of the Solana verifier program produced by `sunspot deploy` and deployed via `solana program deploy`.
- Upgrade authority policy and ceremonies.
- Verification smoke checks.
- Incident response / rollback plan.

## Safety gates

- The CLI refuses `--cluster mainnet-beta` for `deploy`, `verify-onchain`, and `simulate-onchain` unless you pass `--allow-mainnet`.

## Pre-flight checklist

- Toolchain versions match `tool-versions`.
- Release artifacts are reproducible:
  - Prefer using the pinned `Dockerfile` for the build environment.
  - Re-build artifacts from source and compare outputs/hashes where feasible.
- SBOM and provenance attestations exist for the tag/release you are using.
- `GNARK_VERIFIER_BIN` points to the Sunspot verifier-bin crate directory.
- Solana CLI config is correct and wallet has sufficient SOL for fees.

### Verifiable build procedure (recommended)

1) Build the pinned toolchain container:

```bash
docker build -t noirforge-toolchain -f Dockerfile .
```

2) Run pipeline inside the container:

```bash
docker run --rm \
  -v "$PWD:/workspace" \
  -w /workspace \
  noirforge-toolchain \
  bash -lc "pnpm install --frozen-lockfile && pnpm test"
```

Notes:

- The release workflow already generates `sbom.spdx.json` and a provenance attestation.
- Prefer deploying from a tagged release (`vMAJOR.MINOR.PATCH`) that has:
  - the SBOM artifact
  - the provenance attestation
  - the packaged CLI/SDK artifacts

### Mainnet smoke test automation (manual)

This repo includes a manual GitHub Actions workflow:

- `.github/workflows/mainnet-smoke.yml` (workflow_dispatch)

It runs the existing mainnet E2E smoke test and requires a funded payer secret.

## Deployment policy

### Upgrade authority

Choose one of these modes:

- **Mutable** (short-term / emergency window)
  - Deploy with an explicit upgrade authority keypair.
  - Recommended to use a multisig / timelock-controlled authority.
- **Immutable** (preferred for final releases)
  - Deploy with `--final` (Solana marks the program immutable).

Notes:

- `--final` and `--upgrade-authority` are mutually exclusive.
- After deploy, NoirForge records `deployed_program_upgrade_authority` (when available via `solana program show`).

### Recommended ceremony / role separation

- Separate roles:
  - payer keypair (fees)
  - upgrade authority keypair (only if deploying mutable)
- For mainnet, treat the upgrade authority as a high-value key:
  - store in a secret manager or hardware-backed custody
  - consider a governance-controlled authority (multisig / timelock)
- If deploying immutable (`--final`), ensure you have an explicit sign-off before proceeding.

## Deploy procedure (mainnet-beta)

1) Build and prove locally

```bash
pnpm noirforge test --circuit-dir <circuit_dir>
pnpm noirforge build --circuit-dir <circuit_dir> --artifact-name <artifact>
pnpm noirforge prove --circuit-dir <circuit_dir> --artifact-name <artifact>
pnpm noirforge verify-local --artifact-name <artifact>
```

2) Deploy verifier program

```bash
pnpm noirforge deploy --artifact-name <artifact> --cluster mainnet-beta --allow-mainnet
```

If deploying immutable:

```bash
pnpm noirforge deploy --artifact-name <artifact> --cluster mainnet-beta --allow-mainnet --final
```

If deploying with an explicit upgrade authority:

```bash
pnpm noirforge deploy --artifact-name <artifact> --cluster mainnet-beta --allow-mainnet --upgrade-authority <authority_keypair.json>
```

3) On-chain verification smoke

```bash
pnpm noirforge verify-onchain --artifact-name <artifact> --cluster mainnet-beta --allow-mainnet
```

4) Capture observability

- Record:
  - program id
  - deploy signature
  - verify signature
  - compute units / fee via `tx-stats`

Optional (recommended):

- Emit JSONL events while running commands:
  - `NOIRFORGE_OBS_EVENTS_PATH=./artifacts/<artifact>/local/noirforge-obs.jsonl`
- Index and summarize transactions:
  - `noirforge index-program --artifact-name <artifact> --cluster mainnet-beta --limit 50`
  - `noirforge report-index --artifact-name <artifact> --format kv`

## Rollback / incident response

### If a deployment is wrong before it is made immutable

- If you control upgrade authority:
  - Pause deployment.
  - Deploy a fixed program version under the same program id (upgrade).
  - Re-run verification smoke checks.

Recommended evidence collection:

- `noirforge tx-stats --artifact-name <artifact> --cluster mainnet-beta --signature <sig>`
- `noirforge index-tx --artifact-name <artifact> --cluster mainnet-beta --signature <sig>`

### If the program is immutable (or authority is lost)

- You cannot upgrade the program id.
- Deploy a new verifier program (new program id) and publish the new id as the supported verifier.
- Keep a deprecation note for the old program id.

### If verification starts failing

- Confirm whether failures are:
  - local proof generation (nargo/sunspot)
  - RPC issues / rate limiting
  - on-chain program errors
- Collect:
  - failing transaction signatures
  - logs (via explorer / `getTransaction`)
  - NoirForge artifact manifest used

Suggested triage flow:

- Confirm the verifier program id matches expectation (manifest + explorer).
- Fetch and inspect:
  - `solana program show <program_id> --url mainnet-beta`
  - `noirforge tx-stats --signature <sig> --cluster mainnet-beta`
- If failures correlate with RPC instability, re-run using alternate endpoints (`--rpc-endpoints`).

## Post-deploy checklist

- Confirm upgrade authority state matches intent.
- Confirm manifests / hashes captured for the deployed `.so` and keypair.
- Confirm at least one successful on-chain verification tx on mainnet-beta.
