# Docker environment

NoirForge includes a repo-root `Dockerfile` that provides a pinned toolchain environment for reproducible runs.

This is useful when:

- you want consistent versions of `node`, `pnpm`, `rust`, `go`, `solana`, `nargo`, and `sunspot`
- you want `GNARK_VERIFIER_BIN` preconfigured for `noirforge deploy`
- you want to run the full local pipeline in an isolated Linux environment

## Build the image

From the repo root:

```bash
docker build -t noirforge-dev .
```

## Run an interactive shell

```bash
docker run --rm -it -v "$PWD:/workspace" noirforge-dev
```

Inside the container, your repo will be available at `/workspace`.

## Included tools

The Docker image installs a pinned set of tools via build args in the Dockerfile:

- Node + pnpm
- Rust (via rustup)
- Go
- Solana CLI
- `noirup` + `nargo`
- Sunspot (built from a pinned commit)

## `GNARK_VERIFIER_BIN`

The Docker image sets:

- `GNARK_VERIFIER_BIN=/opt/sunspot/gnark-solana/crates/verifier-bin`

This is required for `sunspot deploy` / `noirforge deploy` because Sunspot builds the Solana verifier program via `cargo build-sbf`.

## Typical workflow

Inside the container:

```bash
pnpm install
pnpm noirforge init sum_a_b /tmp/sum_a_b
pnpm noirforge build --circuit-dir /tmp/sum_a_b --artifact-name my_artifact
pnpm noirforge prove --circuit-dir /tmp/sum_a_b --artifact-name my_artifact
pnpm noirforge verify-local --artifact-name my_artifact
```

If you want to deploy to devnet, you still need a Solana payer keypair available to the container.

## Notes

- Artifact paths and manifests produced inside Docker will reference paths *as seen inside the container* unless you use `--relative-paths-only`.
- Treat any mounted directories as part of your trust boundary; do not run untrusted code in the same mounted workspace.
