# anonymous_voting (NoirForge template)

This is a minimal “anonymous ballot” toy circuit:

- `vote` is private, constrained to be boolean (`0` or `1`).
- `encrypted_vote` is public.
- The circuit enforces `encrypted_vote = vote + nonce` with a private `nonce`.

This models an anonymous submission where verifiers can validate a ballot is well-formed without learning the underlying vote.

## Quick start (inside this repo)

From the repo root:

```bash
pnpm noirforge init anonymous_voting
```

This will create `./anonymous_voting/`.

## Local flow

```bash
pnpm noirforge test --circuit-dir ./anonymous_voting
pnpm noirforge build --circuit-dir ./anonymous_voting --artifact-name anon_vote_from_template
pnpm noirforge prove --circuit-dir ./anonymous_voting --artifact-name anon_vote_from_template
pnpm noirforge verify-local --artifact-name anon_vote_from_template
```

## Devnet flow

```bash
pnpm noirforge deploy --artifact-name anon_vote_from_template --cluster devnet
pnpm noirforge verify-onchain --artifact-name anon_vote_from_template --cluster devnet
```

## SDK client script

```bash
pnpm -C packages/sdk-ts build
node anonymous_voting/client/verify-from-manifest.js \
  --manifest artifacts/anon_vote_from_template/local/noirforge.json \
  --rpc https://api.devnet.solana.com \
  --cu-limit 250000
```

By default, the payer keypair is `~/.config/solana/id.json`.
