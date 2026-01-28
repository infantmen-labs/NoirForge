# Demo on Devnet (hackathon gate)

For hackathon/demo purposes, NoirForge is **devnet-verified** and does not require a mainnet deploy.

## See also

- [Security policy](/docs/security/security-policy)
- [Mainnet readiness](/docs/mainnet-readiness)

## Run via GitHub Actions

- Workflow: Actions → Devnet Template QA → Run workflow
- Recommended: set `template=<name>` to run a single template
  - Examples: `template=sum_a_b`, `template=hidden_balances`, `template=private_kyc_proof`, `template=confidential_payments`
- If you leave `template` empty, the workflow runs all templates (slower and more devnet SOL usage).

## Verified devnet proof (sum_a_b)

- `deployed_program_id`: `FbHaskXSmLAgvTKJA6o2AF9dvbxN6rUS1o7ePuArXvAS`
- `deployed_program_deploy_signature`: `2EbsJWpENXsjaymH64fXMoJUxM3NUcEqitNdkeVtkVXNwBZVe7xtMdNEj5s7LSznZ1Dnv7ebHZq4RQ4GY1TiAgXF`
- `verify_onchain_signature`: `3k73UUa14HFTuMihzh2HenmVvscUJAoLTJvm2TFjJVjs5tRKhP71hg74VDHhNbBRKDX9fSEUfYkbN762KGEFMn4g`

Explorer links (devnet):

- Program: https://explorer.solana.com/address/FbHaskXSmLAgvTKJA6o2AF9dvbxN6rUS1o7ePuArXvAS?cluster=devnet
- Deploy tx: https://explorer.solana.com/tx/2EbsJWpENXsjaymH64fXMoJUxM3NUcEqitNdkeVtkVXNwBZVe7xtMdNEj5s7LSznZ1Dnv7ebHZq4RQ4GY1TiAgXF?cluster=devnet
- Verify tx: https://explorer.solana.com/tx/3k73UUa14HFTuMihzh2HenmVvscUJAoLTJvm2TFjJVjs5tRKhP71hg74VDHhNbBRKDX9fSEUfYkbN762KGEFMn4g?cluster=devnet

## Verified devnet proof + SPL transfer (private_transfer_authorization)

- `deployed_program_id`: `2DbKgTxPqF2pk835bqetK7RqcAudUhbTcPE7wVWuMprr`
- verify + transfer tx (devnet): https://explorer.solana.com/tx/2bhiT1WVM66PYixGbhAaeoV5qKaVeswQQbuWDm12sJXnr7FuoerXm4x7JzmJJ8KtXrGMwDwPb6yTtYpDjuQGyhry?cluster=devnet

Explorer links (devnet):

- Program: https://explorer.solana.com/address/2DbKgTxPqF2pk835bqetK7RqcAudUhbTcPE7wVWuMprr?cluster=devnet

Mainnet deployment is intentionally deferred due to rent/fee costs.
