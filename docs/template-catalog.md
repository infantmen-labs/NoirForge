# Template Catalog

Templates live in `templates/` and can be instantiated via:

```bash
pnpm noirforge init <template_name> <dest_dir>
```

## Templates

## `sum_a_b`

- Purpose: Minimal “hello world” circuit for validating the end-to-end pipeline.
- Typical flow:
  - build → prove → verify-local
  - optional: deploy → verify-onchain

## `zk_gated_access_control`

- Purpose: Example of proof-gated access control.
- Demonstrates: proving a statement locally and using proof verification as an authorization primitive.

## `anonymous_voting`

- Purpose: Example of privacy-preserving voting.
- Demonstrates: vote validity constraints and private inputs.

## `selective_disclosure`

- Purpose: Example of selective disclosure / credential-style proving.
- Demonstrates: revealing only specific public inputs while keeping other attributes private.

## `private_transfer_authorization`

- Purpose: Example of proof-gated transfer authorization.
- Demonstrates: using a proof as a capability for an on-chain action.
