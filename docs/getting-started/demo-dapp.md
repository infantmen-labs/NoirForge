# Demo dApp (wallet + on-chain verify)

The docs site has a browser-only live demo that can validate a manifest and build `instruction_data`.

If you want the full end-to-end flow (connect a wallet and submit a real devnet verify transaction), use the in-repo demo dApp.

## Start the demo dApp

From the repo root:

```bash
pnpm demo:start
```

Open:

- http://localhost:3001

## Inputs

You need three files from an artifact directory:

- `artifacts/<artifact_name>/local/noirforge.json`
- `artifacts/<artifact_name>/local/<name>.proof`
- `artifacts/<artifact_name>/local/<name>.pw`

Tip: The canonical proof and witness file names are recorded in `noirforge.json` under `outputs_rel.proof` and `outputs_rel.public_witness`.

## Wallet network

If your RPC URL is devnet but your wallet is set to mainnet, the wallet popup may show a failed simulation even though the devnet transaction succeeds.

Set your wallet network to match the dApp RPC (devnet recommended).

## See also

- [Live demo](/docs/getting-started/live-demo)
- [Devnet demo (hackathon gate)](/docs/getting-started/devnet-demo)
- [Instruction encoding](/docs/concepts/instruction-encoding)
