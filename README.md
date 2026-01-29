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
pnpm noirforge flow --template sum_a_b --dest /tmp/sum_a_b --artifact-name sum_a_b_demo

# equivalent manual steps
pnpm noirforge init sum_a_b /tmp/sum_a_b
pnpm noirforge build --circuit-dir /tmp/sum_a_b --artifact-name sum_a_b_demo
pnpm noirforge prove --circuit-dir /tmp/sum_a_b --artifact-name sum_a_b_demo
pnpm noirforge verify-local --artifact-name sum_a_b_demo
```

Artifacts are written under:

- `artifacts/<artifact_name>/local/`

### Deploy + verify on devnet (optional)

```bash
pnpm noirforge flow --template sum_a_b --dest /tmp/sum_a_b --artifact-name sum_a_b_demo --cluster devnet

# equivalent manual steps
pnpm noirforge deploy --artifact-name sum_a_b_demo --cluster devnet
pnpm noirforge verify-onchain --artifact-name sum_a_b_demo --cluster devnet
pnpm noirforge tx-stats --artifact-name sum_a_b_demo --cluster devnet
```

### RPC providers (Helius / QuickNode)

On-chain and indexing commands support selecting an RPC/WebSocket provider via `--rpc-provider <default|quicknode|helius>`.

For Helius, the recommended setup is to provide a single environment variable:

```bash
export NOIRFORGE_HELIUS_API_KEY="<your_helius_api_key>"
```

Then run commands with:

```bash
pnpm noirforge tx-stats --artifact-name sum_a_b_demo --cluster devnet --rpc-provider helius
```

For details and override precedence, see:

- `docs/cli/configuration.md`
- `docs/security/secrets-and-credentials.md`

## Demo on Devnet (hackathon gate)

For hackathon/demo purposes, NoirForge is devnet-verified and does not require a mainnet deploy.

Run the full devnet template QA for a single template via GitHub Actions:

- Workflow: Actions → Devnet Template QA → Run workflow
- Input: `template=sum_a_b`

Verified devnet proof (sum_a_b):

- `deployed_program_id`: `FbHaskXSmLAgvTKJA6o2AF9dvbxN6rUS1o7ePuArXvAS`
- `deployed_program_deploy_signature`: `2EbsJWpENXsjaymH64fXMoJUxM3NUcEqitNdkeVtkVXNwBZVe7xtMdNEj5s7LSznZ1Dnv7ebHZq4RQ4GY1TiAgXF`
- `verify_onchain_signature`: `3k73UUa14HFTuMihzh2HenmVvscUJAoLTJvm2TFjJVjs5tRKhP71hg74VDHhNbBRKDX9fSEUfYkbN762KGEFMn4g`

Explorer links (devnet):

- Program: https://explorer.solana.com/address/FbHaskXSmLAgvTKJA6o2AF9dvbxN6rUS1o7ePuArXvAS?cluster=devnet
- Deploy tx: https://explorer.solana.com/tx/2EbsJWpENXsjaymH64fXMoJUxM3NUcEqitNdkeVtkVXNwBZVe7xtMdNEj5s7LSznZ1Dnv7ebHZq4RQ4GY1TiAgXF?cluster=devnet
- Verify tx: https://explorer.solana.com/tx/3k73UUa14HFTuMihzh2HenmVvscUJAoLTJvm2TFjJVjs5tRKhP71hg74VDHhNbBRKDX9fSEUfYkbN762KGEFMn4g?cluster=devnet

Mainnet deployment is intentionally deferred (rent/fee costs) and remains post-hackathon milestone.

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
- VS Code extension (dev): `packages/vscode-extension/`

Documentation UI (local):

```bash
pnpm docs:start
```

- Live demo: http://localhost:3000/demo
- Metrics: http://localhost:3000/metrics
- Templates: http://localhost:3000/templates
- Playground: http://localhost:3000/playground

## Releases

- Tag pushes matching `vMAJOR.MINOR.PATCH` trigger the GitHub release workflow.
- The workflow attaches build artifacts and generates provenance attestations, including:
  - `noirforge-cli.tgz`
  - `noirforge-sdk-ts-dist.tgz`
  - `noirforge-sdk.crate`
  - `sbom.spdx.json`

## Security

Please see `SECURITY.md` for vulnerability reporting.
