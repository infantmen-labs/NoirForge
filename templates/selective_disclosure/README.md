# selective_disclosure (NoirForge template)

This is a minimal “selective disclosure” toy circuit:

- `disclosed` is public.
- `hidden` is private.
- `commitment` is public.

The circuit enforces:

- `disclosed + hidden == commitment`

This models selectively revealing one attribute while proving consistency against a public commitment.

## Quick start (inside this repo)

From the repo root:

```bash
pnpm noirforge init selective_disclosure
```

## Local flow

```bash
pnpm noirforge test --circuit-dir ./selective_disclosure
pnpm noirforge build --circuit-dir ./selective_disclosure --artifact-name selective_disclosure_from_template
pnpm noirforge prove --circuit-dir ./selective_disclosure --artifact-name selective_disclosure_from_template
pnpm noirforge verify-local --artifact-name selective_disclosure_from_template
```

## Devnet flow

```bash
pnpm noirforge deploy --artifact-name selective_disclosure_from_template --cluster devnet
pnpm noirforge verify-onchain --artifact-name selective_disclosure_from_template --cluster devnet
```

## SDK client script

```bash
pnpm -C packages/sdk-ts build
node selective_disclosure/client/verify-from-manifest.js \
  --manifest artifacts/selective_disclosure_from_template/local/noirforge.json \
  --rpc https://api.devnet.solana.com \
  --cu-limit 250000
```
