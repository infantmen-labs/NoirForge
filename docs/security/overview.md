# Security overview

NoirForge’s security posture is primarily about:

- preventing key disclosure
- preventing artifact tampering / confusion
- maintaining supply-chain integrity (pinned toolchains, SBOM, provenance)
- making mainnet actions explicit and deliberate

## Key documents

- Threat model: `threat-model`
- Key management policy: `key-management`
- Secrets and credentials: `security/secrets-and-credentials`
- Dependency policy: `dependency-policy`

## Mainnet note

Mainnet deployment is gated and should only be performed after explicit readiness checks.
See `mainnet-readiness`.
