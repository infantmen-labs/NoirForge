# @noirforge/cli

NoirForge CLI: reproducible Noir + Sunspot pipeline, Solana deploy, and verification tooling.

## Install

```bash
npm i -g @noirforge/cli
```

## Quickstart

From a repo checkout:

```bash
noirforge help
noirforge init sum_a_b
cd sum_a_b
noirforge build
noirforge prove
noirforge deploy --cluster devnet
noirforge verify-onchain --cluster devnet
```

Mainnet deploy/verify is intentionally gated. If you know what you’re doing, you must pass `--allow-mainnet`.

Repository: https://github.com/infantmen-labs/NoirForge
