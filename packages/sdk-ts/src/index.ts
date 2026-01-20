import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import {
  ComputeBudgetProgram,
  Connection,
  clusterApiUrl,
  type Commitment,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

export class NoirforgeSdkError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'NoirforgeSdkError';
    this.cause = cause;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(e: unknown): boolean {
  const message =
    e && typeof e === 'object' && 'message' in e && typeof (e as any).message === 'string' ? (e as any).message : String(e);
  const m = message.toLowerCase();
  return m.includes('429') || m.includes('too many requests') || m.includes('rate limit') || m.includes('rate-limited');
}

function backoffDelayMs(attempt: number, baseMs: number, maxMs: number): number {
  const exp = Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, attempt)));
  const jitter = Math.floor(Math.random() * Math.min(100, exp + 1));
  return Math.min(maxMs, exp + jitter);
}

export type RpcProviderOpts = {
  endpoints: string[];
  wsEndpoints?: string[];
  commitment?: Commitment;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  rateLimitDelayMs?: number;
};

export class RpcProvider {
  private endpoints: string[];
  private wsEndpoints?: string[];
  private commitment: Commitment;
  private maxRetries: number;
  private baseDelayMs: number;
  private maxDelayMs: number;
  private rateLimitDelayMs: number;
  private idx = 0;

  private createConnection: (endpoint: string, wsEndpoint?: string) => Connection;
  private sleepFn: (ms: number) => Promise<void>;

  constructor(
    opts: RpcProviderOpts,
    internal?: { createConnection?: (endpoint: string, wsEndpoint?: string) => Connection; sleep?: (ms: number) => Promise<void> }
  ) {
    if (!opts || !Array.isArray(opts.endpoints) || opts.endpoints.length === 0) {
      throw new Error('RpcProvider requires at least one endpoint');
    }

    this.endpoints = opts.endpoints;
    this.wsEndpoints = Array.isArray(opts.wsEndpoints) ? opts.wsEndpoints : undefined;
    this.commitment = opts.commitment || 'confirmed';
    this.maxRetries = typeof opts.maxRetries === 'number' ? opts.maxRetries : 3;
    this.baseDelayMs = typeof opts.baseDelayMs === 'number' ? opts.baseDelayMs : 250;
    this.maxDelayMs = typeof opts.maxDelayMs === 'number' ? opts.maxDelayMs : 5_000;
    this.rateLimitDelayMs = typeof opts.rateLimitDelayMs === 'number' ? opts.rateLimitDelayMs : 1_000;

    this.createConnection =
      internal && typeof internal.createConnection === 'function'
        ? internal.createConnection
        : (endpoint, wsEndpoint) =>
            wsEndpoint
              ? new Connection(endpoint, { commitment: this.commitment, wsEndpoint })
              : new Connection(endpoint, this.commitment);
    this.sleepFn = internal && typeof internal.sleep === 'function' ? internal.sleep : sleep;
  }

  getCurrentEndpoint(): string {
    return this.endpoints[this.idx];
  }

  getCurrentWsEndpoint(): string | undefined {
    if (!this.wsEndpoints || this.wsEndpoints.length === 0) return undefined;
    if (this.wsEndpoints.length === this.endpoints.length) return this.wsEndpoints[this.idx];
    if (this.wsEndpoints.length === 1) return this.wsEndpoints[0];
    return undefined;
  }

  private failover(): void {
    this.idx = (this.idx + 1) % this.endpoints.length;
  }

  async withConnection<T>(fn: (connection: Connection) => Promise<T>): Promise<T> {
    let lastErr: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const endpoint = this.getCurrentEndpoint();
      const wsEndpoint = this.getCurrentWsEndpoint();
      const connection = this.createConnection(endpoint, wsEndpoint);

      try {
        return await fn(connection);
      } catch (e) {
        lastErr = e;

        if (attempt >= this.maxRetries) {
          throw new RpcError(`RPC request failed after ${attempt + 1} attempt(s) (last endpoint: ${endpoint})`, e);
        }

        const rateLimited = isRateLimitError(e);
        const delay = rateLimited
          ? Math.max(this.rateLimitDelayMs, backoffDelayMs(attempt, this.baseDelayMs, this.maxDelayMs))
          : backoffDelayMs(attempt, this.baseDelayMs, this.maxDelayMs);

        this.failover();
        if (delay > 0) await this.sleepFn(delay);
      }
    }

    throw new RpcError('RPC request failed', lastErr);
  }
}

export function rpcUrlFromCluster(cluster: string): string {
  if (cluster === 'localhost' || cluster === 'localnet') return 'http://127.0.0.1:8899';
  if (cluster === 'devnet' || cluster === 'testnet' || cluster === 'mainnet-beta') return clusterApiUrl(cluster);
  return cluster;
}

export class RpcError extends NoirforgeSdkError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'RpcError';
  }
}

export class TransactionSimulationError extends NoirforgeSdkError {
  logs?: string[];

  constructor(message: string, logs?: string[], cause?: unknown) {
    super(message, cause);
    this.name = 'TransactionSimulationError';
    this.logs = logs;
  }
}

export class TransactionExecutionError extends NoirforgeSdkError {
  signature?: string;
  err?: unknown;
  logs?: string[];

  constructor(message: string, opts?: { signature?: string; err?: unknown; logs?: string[]; cause?: unknown }) {
    super(message, opts?.cause);
    this.name = 'TransactionExecutionError';
    this.signature = opts?.signature;
    this.err = opts?.err;
    this.logs = opts?.logs;
  }
}

function asStringArray(x: unknown): string[] | undefined {
  return Array.isArray(x) && x.every((v) => typeof v === 'string') ? (x as string[]) : undefined;
}

function classifySendError(e: unknown): NoirforgeSdkError {
  const message =
    e && typeof e === 'object' && 'message' in e && typeof (e as any).message === 'string'
      ? (e as any).message
      : String(e);
  const logs = e && typeof e === 'object' ? asStringArray((e as any).logs) : undefined;

  if (message.toLowerCase().includes('simulation') || logs) {
    return new TransactionSimulationError(message, logs, e);
  }
  return new RpcError(message, e);
}

export type NoirforgeManifest = {
  schema_version?: number;
  name?: string;
  proving_system?: string;
  outputs?: Record<string, unknown>;
  outputs_rel?: Record<string, unknown>;
  hashes?: Record<string, unknown>;
  toolchain?: Record<string, unknown>;
};

export type WalletLike = {
  publicKey: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
};

export async function loadManifest(manifestPath: string): Promise<NoirforgeManifest> {
  const txt = await fs.readFile(manifestPath, 'utf8');
  return JSON.parse(txt) as NoirforgeManifest;
}

export function resolveOutputs(manifest: NoirforgeManifest, artifactDir: string): Record<string, unknown> {
  const outputs = (manifest.outputs || {}) as Record<string, unknown>;
  const outputsRel = (manifest.outputs_rel || {}) as Record<string, unknown>;

  const resolved: Record<string, unknown> = { ...outputs };

  for (const [k, v] of Object.entries(outputsRel)) {
    if (typeof v === 'string') {
      const isMetadataKey =
        k.endsWith('_id') ||
        k.endsWith('_signature') ||
        k.endsWith('_cluster') ||
        k.includes('signature') ||
        k.includes('cluster');

      resolved[k] = isMetadataKey ? v : path.resolve(artifactDir, v);
    } else {
      resolved[k] = v;
    }
  }

  return resolved;
}

export async function readFileBytes(filePath: string): Promise<Buffer> {
  return Buffer.from(await fs.readFile(filePath));
}

export function buildInstructionData(proofBytes: Buffer, publicWitnessBytes: Buffer): Buffer {
  return Buffer.concat([proofBytes, publicWitnessBytes]);
}

export function buildVerifyInstruction(programId: PublicKey, instructionData: Buffer): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [],
    data: instructionData,
  });
}

export async function loadKeypairFromFile(keypairPath: string): Promise<Keypair> {
  const txt = await fs.readFile(keypairPath, 'utf8');
  const arr = JSON.parse(txt) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(arr));
}

export type SubmitVerifyTxOpts = {
  connection: Connection;
  payer: Keypair;
  programId: PublicKey;
  instructionData: Buffer;
  computeUnitLimit?: number;
};

export async function submitVerifyTransaction(opts: SubmitVerifyTxOpts): Promise<string> {
  try {
    const ix = buildVerifyInstruction(opts.programId, opts.instructionData);
    const tx = new Transaction();

    if (opts.computeUnitLimit) {
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: opts.computeUnitLimit }));
    }

    tx.add(ix);

    return await sendAndConfirmTransaction(opts.connection, tx, [opts.payer], {
      commitment: 'confirmed',
    });
  } catch (e) {
    throw classifySendError(e);
  }
}

export type SubmitVerifyTxWithWalletOpts = {
  connection: Connection;
  wallet: WalletLike;
  programId: PublicKey;
  instructionData: Buffer;
  computeUnitLimit?: number;
  skipPreflight?: boolean;
  fetchLogsOnError?: boolean;
};

export async function submitVerifyTransactionWithWallet(opts: SubmitVerifyTxWithWalletOpts): Promise<string> {
  const tx = new Transaction();
  tx.feePayer = opts.wallet.publicKey;

  if (opts.computeUnitLimit) {
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: opts.computeUnitLimit }));
  }
  tx.add(buildVerifyInstruction(opts.programId, opts.instructionData));

  const latest = await opts.connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = latest.blockhash;

  try {
    const signed = await opts.wallet.signTransaction(tx);
    const sig = await opts.connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: Boolean(opts.skipPreflight),
    });

    const conf = await opts.connection.confirmTransaction(
      { signature: sig, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
      'confirmed'
    );

    if (conf.value.err) {
      let logs: string[] | undefined;
      if (opts.fetchLogsOnError !== false) {
        const txInfo = await opts.connection.getTransaction(sig, { commitment: 'confirmed' });
        logs = txInfo?.meta?.logMessages || undefined;
      }
      throw new TransactionExecutionError('Transaction confirmed with error', { signature: sig, err: conf.value.err, logs });
    }

    return sig;
  } catch (e) {
    if (e instanceof NoirforgeSdkError) throw e;
    throw classifySendError(e);
  }
}

export type VerifyFromManifestOpts = {
  connection: Connection;
  payer: Keypair;
  artifactDir: string;
  manifest: NoirforgeManifest;
  computeUnitLimit?: number;
};

export async function submitVerifyFromManifest(opts: VerifyFromManifestOpts): Promise<string> {
  const outputs = resolveOutputs(opts.manifest, opts.artifactDir);

  const programIdStr = outputs.deployed_program_id || outputs.built_program_id || outputs.program_id;
  if (typeof programIdStr !== 'string') {
    throw new Error('Manifest missing program id (expected outputs.deployed_program_id or outputs.built_program_id or outputs.program_id)');
  }

  const proofPath = outputs.proof;
  const pwPath = outputs.public_witness;
  if (typeof proofPath !== 'string' || typeof pwPath !== 'string') {
    throw new Error('Manifest missing proof/public_witness paths (expected outputs.proof and outputs.public_witness)');
  }

  const proofBytes = await readFileBytes(proofPath);
  const publicWitnessBytes = await readFileBytes(pwPath);
  const instructionData = buildInstructionData(proofBytes, publicWitnessBytes);

  return await submitVerifyTransaction({
    connection: opts.connection,
    payer: opts.payer,
    programId: new PublicKey(programIdStr),
    instructionData,
    computeUnitLimit: opts.computeUnitLimit,
  });
}

export type VerifyFromManifestWithWalletOpts = {
  connection: Connection;
  wallet: WalletLike;
  artifactDir: string;
  manifest: NoirforgeManifest;
  computeUnitLimit?: number;
  skipPreflight?: boolean;
  fetchLogsOnError?: boolean;
};

export async function submitVerifyFromManifestWithWallet(opts: VerifyFromManifestWithWalletOpts): Promise<string> {
  const outputs = resolveOutputs(opts.manifest, opts.artifactDir);

  const programIdStr = outputs.deployed_program_id || outputs.built_program_id || outputs.program_id;
  if (typeof programIdStr !== 'string') {
    throw new Error('Manifest missing program id (expected outputs.deployed_program_id or outputs.built_program_id or outputs.program_id)');
  }

  const proofPath = outputs.proof;
  const pwPath = outputs.public_witness;
  if (typeof proofPath !== 'string' || typeof pwPath !== 'string') {
    throw new Error('Manifest missing proof/public_witness paths (expected outputs.proof and outputs.public_witness)');
  }

  const proofBytes = await readFileBytes(proofPath);
  const publicWitnessBytes = await readFileBytes(pwPath);
  const instructionData = buildInstructionData(proofBytes, publicWitnessBytes);

  return await submitVerifyTransactionWithWallet({
    connection: opts.connection,
    wallet: opts.wallet,
    programId: new PublicKey(programIdStr),
    instructionData,
    computeUnitLimit: opts.computeUnitLimit,
    skipPreflight: opts.skipPreflight,
    fetchLogsOnError: opts.fetchLogsOnError,
  });
}
