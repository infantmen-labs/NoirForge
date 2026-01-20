# NoirForge

NoirForge is a minimal, reproducible wrapper around the Noir + Sunspot pipeline for generating Groth16 proofs and verifying them (locally and on Solana).

## Quickstart

### Prerequisites

- Linux/WSL2 (recommended)
- Toolchain versions are pinned in `tool-versions`
- `nargo` and `sunspot` must be on `PATH`
- For on-chain actions:
  - Solana CLI configured
  - A payer keypair (default: `~/.config/solana/id.json`)

If you prefer a pinned environment, use the included `Dockerfile`:

- Build: `docker build -t noirforge-dev .`
- Run: `docker run --rm -it -v "$PWD:/workspace" noirforge-dev`

### Install JS dependencies

```bash
pnpm install
```

### Run a template end-to-end (local)

```bash
# from repo root
pnpm noirforge init sum_a_b /tmp/sum_a_b
pnpm noirforge build --circuit-dir /tmp/sum_a_b --artifact-name sum_a_b_demo
pnpm noirforge prove --circuit-dir /tmp/sum_a_b --artifact-name sum_a_b_demo
pnpm noirforge verify-local --artifact-name sum_a_b_demo
```

Artifacts are written under:

- `artifacts/<artifact_name>/local/`

### Deploy + verify on devnet (optional)

```bash
pnpm noirforge deploy --artifact-name sum_a_b_demo --cluster devnet
pnpm noirforge verify-onchain --artifact-name sum_a_b_demo --cluster devnet
pnpm noirforge tx-stats --artifact-name sum_a_b_demo --cluster devnet
```

### Tests

Run the full repository test suite (matches CI):

```bash
pnpm test
```

- CLI unit tests: `pnpm -C packages/cli test`
- CLI integration tests: `pnpm -C packages/cli test:integration`
- CLI devnet E2E tests (triggered): `NOIRFORGE_E2E_DEVNET=1 pnpm -C packages/cli test:e2e:devnet`
- sdk-ts unit tests: `pnpm -C packages/sdk-ts test`

## Documentation

- Template catalog: `docs/template-catalog.md`
- Troubleshooting: `docs/troubleshooting.md`
- Examples: `examples/`

## Releases

- Tag pushes matching `vMAJOR.MINOR.PATCH` trigger the GitHub release workflow.
- The workflow attaches build artifacts and generates provenance attestations, including:
  - `noirforge-cli.tgz`
  - `noirforge-sdk-ts-dist.tgz`
  - `noirforge-sdk.crate`
  - `sbom.spdx.json`

## Security

Please see `SECURITY.md` for vulnerability reporting.
