# CLI overview

NoirForge’s CLI is the source of truth for:

- artifact layout
- manifest semantics
- toolchain and environment checks

Run all commands via:

```bash
pnpm noirforge <command>
```

## See also

- [CLI configuration](./configuration)

## Environment requirements

- `nargo` on `PATH`
- `sunspot` on `PATH`
- `GNARK_VERIFIER_BIN` set (required for `deploy`)

## Mainnet safety

Commands that touch Solana refuse `--cluster mainnet-beta` unless you pass `--allow-mainnet`.
