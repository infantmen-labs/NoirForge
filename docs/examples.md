# Examples

This repo includes runnable examples demonstrating how to use NoirForge artifacts and SDKs.

If you are looking for a full end-to-end pipeline starting from a Noir circuit, start with the templates in `templates/`.

## TypeScript SDK example

Location:

- `examples/sdk-ts-verify-from-manifest/`

Run:

```bash
pnpm -C packages/sdk-ts build
node examples/sdk-ts-verify-from-manifest/verify-from-manifest.js \
  --manifest artifacts/my_artifact/local/noirforge.json \
  --rpc https://api.devnet.solana.com \
  --cu-limit 250000
```

See also:

- [SDK usage](/docs/sdk-usage)
- [TypeScript SDK](/docs/sdks/typescript)
- [CLI configuration](/docs/cli/configuration)
- [Secrets and credentials](/docs/security/secrets-and-credentials)

## Rust SDK example

Location:

- `examples/rust-sdk-instruction-data/`

Run:

```bash
cargo run --manifest-path examples/rust-sdk-instruction-data/Cargo.toml
```

See also:

- [Rust SDK](/docs/sdks/rust)
- [Instruction encoding](/docs/concepts/instruction-encoding)

## Templates

Templates are complete, known-good starting points for the CLI pipeline:

- `templates/sum_a_b`
- `templates/zk_gated_access_control`
- `templates/anonymous_voting`
- `templates/selective_disclosure`
- `templates/private_transfer_authorization`

Start a template workspace with:

```bash
pnpm noirforge init <template> <dest>
```

## Contributing

If you run into issues or want to improve an example/template, see:

- [Contributing](/docs/contributing)
