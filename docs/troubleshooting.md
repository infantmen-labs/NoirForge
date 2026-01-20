# Troubleshooting

## WSL / Linux environment

- Run inside WSL2/Linux for best compatibility.
- Toolchain versions are pinned in `tool-versions`.

## `nargo` not found

- Ensure `noirup` is installed and `~/.nargo/bin` is on your `PATH`.
- Verify:
  - `nargo --version`

## `sunspot` not found

- Ensure the pinned Sunspot binary is on `PATH`.
- Verify:
  - `sunspot --help`

## `GNARK_VERIFIER_BIN` not set (deploy fails)

`noirforge deploy` requires `GNARK_VERIFIER_BIN` to point at the `gnark-solana/crates/verifier-bin` directory used by Sunspot.

- Example:
  - `export GNARK_VERIFIER_BIN="$HOME/.local/src/sunspot/gnark-solana/crates/verifier-bin"`

If you are using the repo `Dockerfile`, `GNARK_VERIFIER_BIN` is set inside the image.

## Solana deploy failures

Common causes:

- Wrong cluster:
  - confirm `solana config get` and/or pass `--cluster devnet`
- Insufficient balance:
  - confirm payer has SOL (devnet airdrop if needed)
- Upgrade authority surprises:
  - use `noirforge deploy --cluster devnet --final` for immutability
  - or `--upgrade-authority <keypair.json>` to set an explicit authority

## RPC rate limiting / flaky requests

On-chain commands support failover and basic rate-limit handling:

- `--rpc-endpoints <csv>`
- `--ws-endpoints <csv>`

If you hit rate limits, provide multiple endpoints or switch providers.
