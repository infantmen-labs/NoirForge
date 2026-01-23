# Contributing

## Development setup

- Use Linux/WSL2 (recommended)
- Install dependencies:

```bash
pnpm install
```

- Run tests (matches CI):

```bash
pnpm test
```

## Repo structure

- `packages/cli` - NoirForge CLI
- `packages/sdk-ts` - TypeScript SDK
- `crates/sdk-rs` - Rust SDK
- `templates/` - Template circuits and examples
- `examples/` - Standalone runnable examples
- `docs/` - Documentation

## Pull requests

- Keep changes focused and small when possible.
- Update documentation when you change:
  - CLI behavior
  - manifest semantics
  - SDK APIs
  - templates
- Ensure tests pass:
  - `pnpm test`

## Template contribution process

When adding or modifying a template under `templates/`:

- Include:
  - a runnable Noir circuit
  - a README with clear local and devnet steps
  - minimal scripts (if needed) to demonstrate proving/verification
- Requirements:
  - must pass `noirforge build`, `noirforge prove`, and `noirforge verify-local`
  - devnet deploy/verify instructions should be included (or explicitly marked as optional)
- Avoid committing secrets:
  - no keypairs
  - no API keys

## Style

- Prefer explicit errors and clear CLI output.
- Keep behavior deterministic where possible (pin toolchain versions).
