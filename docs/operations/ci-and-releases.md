# CI and releases

NoirForge uses pinned toolchains and CI workflows to keep builds reproducible and publishing gated.

## Workflows

- CI checks: `.github/workflows/node.yml`
- Release artifacts: `.github/workflows/release.yml`
- Gated publishing: `.github/workflows/publish.yml`
- Devnet QA gate: `.github/workflows/devnet-template-qa.yml`

## Release posture

Recommended posture:

1) Tag a release candidate (e.g. `v0.1.0-rc.N`)
2) Generate release artifacts (SBOM + packaged distributions)
3) Run devnet QA as the default gate
4) Publish to npm/crates with a dist-tag (e.g. `next`)

Mainnet smoke deploy/verify is optional/deferred unless you explicitly choose to run it.
