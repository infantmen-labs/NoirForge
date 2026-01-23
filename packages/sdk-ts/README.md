# @noirforge/sdk

TypeScript SDK for working with NoirForge artifacts and submitting on-chain verification transactions on Solana.

## Install

```bash
npm i @noirforge/sdk @solana/web3.js
```

## Key APIs

- `loadManifestV1(path)` / `validateManifestV1(x)`
- `resolveOutputs(manifest, artifactDir)`
- `buildInstructionData(proofBytes, publicWitnessBytes)`
- `submitVerifyTransaction({ connection, payer, programId, instructionData })`
- `submitVerifyFromManifest({ connection, payer, artifactDir, manifest })`

NoirForge policy: **SDK does not hardcode canonical mainnet program ids**. Provide a `programId` explicitly or rely on `manifest.outputs`.

## Example (verify from manifest)

```ts
import { Connection, Keypair } from '@solana/web3.js';
import { loadManifestV1, submitVerifyFromManifest } from '@noirforge/sdk';

const artifactDir = './artifacts/sum_a_b/devnet';
const manifest = await loadManifestV1(`${artifactDir}/manifest.json`);

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.PAYER_JSON!)));

const signature = await submitVerifyFromManifest({ connection, payer, artifactDir, manifest });
console.log(signature);
```

Repository: https://github.com/infantmen-labs/NoirForge
