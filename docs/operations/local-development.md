# Local development environment

NoirForge is designed to run in a Linux-like environment with a pinned toolchain.

## Recommended environment

- Linux or WSL2 (recommended)

This avoids many of the path and toolchain issues that show up on other platforms.

## Toolchain pinning

The repo pins toolchain versions in:

- `tool-versions`

At minimum, a typical local workflow expects:

- `pnpm`
- `node`
- `nargo`
- `sunspot`

For Solana flows:

- Solana CLI (`solana`, `solana-keygen`)

## `GNARK_VERIFIER_BIN`

`noirforge deploy` requires `GNARK_VERIFIER_BIN` to point at Sunspot’s `verifier-bin` crate directory used for `cargo build-sbf`.

See [Troubleshooting](/docs/troubleshooting) for a concrete example export.

## Choosing Docker vs local installs

### Use Docker when

- you want a known-good pinned toolchain without installing everything locally
- you want `GNARK_VERIFIER_BIN` preconfigured
- you want to reproduce CI-like toolchain behavior

See [Docker environment](/docs/operations/docker).

### Use local installs when

- you want faster iteration (no container boundary)
- you already have the pinned toolchain installed locally

## Quick validation checklist

- Verify Noir toolchain:

```bash
nargo --version
```

- Verify Sunspot is on PATH:

```bash
sunspot --help
```

- Verify Solana CLI (for on-chain flows):

```bash
solana --version
```

- Verify docs site builds:

```bash
pnpm docs:build
```

## See also

- [Quickstart](/docs/getting-started/quickstart)
- [Troubleshooting](/docs/troubleshooting)
- [Docker environment](/docs/operations/docker)
