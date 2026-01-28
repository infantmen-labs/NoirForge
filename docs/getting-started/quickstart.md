# Quickstart

## Prerequisites

- Linux/WSL2 recommended
- `pnpm install`
- Toolchain pinned in `tool-versions` (`nargo`, `sunspot`, Solana CLI)
- `GNARK_VERIFIER_BIN` set (required for `deploy`)

## See also

- [Local development environment](/docs/operations/local-development)
- [CLI configuration](/docs/cli/configuration)
- [Troubleshooting](/docs/troubleshooting)

## 1) Initialize a template

```bash
pnpm noirforge init sum_a_b /tmp/sum_a_b
```

## 2) Run local pipeline

```bash
pnpm noirforge flow --circuit-dir /tmp/sum_a_b --artifact-name my_artifact

# equivalent manual steps
pnpm noirforge test --circuit-dir /tmp/sum_a_b
pnpm noirforge build --circuit-dir /tmp/sum_a_b --artifact-name my_artifact
pnpm noirforge prove --circuit-dir /tmp/sum_a_b --artifact-name my_artifact
pnpm noirforge verify-local --artifact-name my_artifact
```

Artifacts are written under:

- `artifacts/my_artifact/local/`

## 3) Deploy + verify on devnet (optional)

```bash
pnpm noirforge flow --circuit-dir /tmp/sum_a_b --artifact-name my_artifact --cluster devnet

# equivalent manual steps
pnpm noirforge deploy --artifact-name my_artifact --cluster devnet
pnpm noirforge verify-onchain --artifact-name my_artifact --cluster devnet
pnpm noirforge tx-stats --artifact-name my_artifact --cluster devnet
```

Notes:

- Payer defaults to `~/.config/solana/id.json`.
- If you hit RPC rate limits, use `--rpc-endpoints <csv>`.

If you want to submit verification from a wallet UI instead of a keypair, see:

- [Demo dApp (wallet + on-chain verify)](/docs/getting-started/demo-dapp)
