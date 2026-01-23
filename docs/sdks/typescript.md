# TypeScript SDK

Package:

- `@noirforge/sdk`

## Install

```bash
npm i @noirforge/sdk@next @solana/web3.js
```

## What it does

The SDK helps you:

- load and validate `noirforge.json`
- resolve manifest outputs relative to an artifact directory
- build instruction data (`proof || public_witness`)
- submit verification transactions (using either a `Keypair` or a wallet adapter)
- optionally wrap RPC calls with retries/failover (via `RpcProvider`)

## Key APIs

- `loadManifestV1(path)` / `validateManifestV1(x)`
- `resolveOutputs(manifest, artifactDir)`
- `buildInstructionData(proofBytes, publicWitnessBytes)`
- `submitVerifyTransaction({ connection, payer, programId, instructionData })`
- `submitVerifyTransactionWithWallet({ connection, wallet, programId, instructionData })`
- `submitVerifyFromManifest({ connection, payer, artifactDir, manifest })`
- `submitVerifyFromManifestWithWallet({ connection, wallet, artifactDir, manifest })`
- `RpcProvider` (retry + endpoint failover)
- `rpcUrlFromCluster(cluster)`

## Verify from manifest example

```ts
import { Connection, Keypair } from '@solana/web3.js';
import { loadManifestV1, submitVerifyFromManifest } from '@noirforge/sdk';

const artifactDir = './artifacts/my_artifact/devnet';
const manifest = await loadManifestV1(`${artifactDir}/noirforge.json`);

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.PAYER_JSON!)));

const signature = await submitVerifyFromManifest({ connection, payer, artifactDir, manifest });
console.log(signature);
```

If you want retry/failover across multiple endpoints, use `RpcProvider` and call `withConnection(...)`.

For an end-to-end flow, see `sdk-usage`.
