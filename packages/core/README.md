# @noirforge/core

Small, dependency-light helpers shared by NoirForge packages.

## Install

```bash
npm i @noirforge/core@next
```

## What’s inside

- `validateManifestV1(x)`
- `resolveOutputs(manifest, artifactDir)`
- `buildInstructionData(proofBytes, publicWitnessBytes)` (concatenation: `proof || public_witness`)

## Example

```js
const { buildInstructionData, validateManifestV1, resolveOutputs } = require('@noirforge/core');

const res = validateManifestV1(manifestJson);
if (!res.ok) throw new Error(res.errors.join('; '));

const outputs = resolveOutputs(res.manifest, artifactDir);
const instructionData = buildInstructionData(proofBytes, publicWitnessBytes);
```

Repository: https://github.com/infantmen-labs/NoirForge
