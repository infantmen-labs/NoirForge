# Live demo

The NoirForge docs site includes a browser-based demo at `/demo`.

The demo helps you:

- validate a NoirForge manifest (`noirforge.json`)
- build `instruction_data = proof_bytes || public_witness_bytes` from `.proof` and `.pw` files

Nothing is uploaded; all processing happens locally in your browser.

## 1) Start the docs site

From the repo root:

```bash
pnpm docs:start
```

Open:

- http://localhost:3000/demo

## 2) Generate demo input files

You need three files from a local proof run:

- `artifacts/<artifact_name>/local/noirforge.json`
- `artifacts/<artifact_name>/local/<artifact_name>.proof`
- `artifacts/<artifact_name>/local/<artifact_name>.pw`

A concrete example using the `sum_a_b` template:

```bash
pnpm noirforge init sum_a_b
pnpm noirforge build --circuit-dir ./sum_a_b --artifact-name sum_a_b_from_template
pnpm noirforge prove --circuit-dir ./sum_a_b --artifact-name sum_a_b_from_template
```

This writes files under:

- `artifacts/sum_a_b_from_template/local/`

Optional sanity check:

```bash
pnpm noirforge verify-local --artifact-name sum_a_b_from_template
```

## 3) Use the demo UI

In `/demo`:

### 3.1 Validate the manifest

1) In **Manifest (noirforge.json)**, click **Load JSON file**
2) Select `artifacts/<artifact_name>/local/noirforge.json`
3) Click **Validate**

### 3.2 Build instruction data

1) Upload the proof file (`*.proof`)
2) Upload the public witness file (`*.pw`)

The demo will:

- parse the public witness header and input count
- compute `instruction_data` as a raw concatenation: `proof_bytes || public_witness_bytes`

You can then:

- copy `instruction_data` as hex or base64
- download `instruction_data.bin`

## 4) Next steps (optional)

If you want to go beyond the demo UI and submit an on-chain verify transaction:

- [Demo dApp (wallet + on-chain verify)](/docs/getting-started/demo-dapp)
- `noirforge deploy --cluster devnet`
- `noirforge verify-onchain --cluster devnet`

See:

- [Devnet demo](/docs/getting-started/devnet-demo)
- [Demo dApp (wallet + on-chain verify)](/docs/getting-started/demo-dapp)
- [verify-onchain](/docs/cli/commands/verify-onchain)
- [Instruction encoding](/docs/concepts/instruction-encoding)
