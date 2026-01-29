# @noirforge/cli

NoirForge CLI: reproducible Noir + Sunspot pipeline, Solana deploy, and verification tooling.

## Install

```bash
npm i -g @noirforge/cli@next
```

## Quickstart

From a repo checkout:

```bash
noirforge help

# recommended: one-command pipeline (init/build/prove/verify-local)
noirforge flow --template sum_a_b --dest ./sum_a_b --artifact-name sum_a_b_demo

# inspect outputs
noirforge sizes --artifact-name sum_a_b_demo

# optional: devnet deploy + verify
noirforge flow --circuit-dir ./sum_a_b --artifact-name sum_a_b_demo --cluster devnet
noirforge compute-analyze --artifact-name sum_a_b_demo --cluster devnet
```

Mainnet deploy/verify is intentionally gated. If you know what you’re doing, you must pass `--allow-mainnet`.

Repository: https://github.com/infantmen-labs/NoirForge
