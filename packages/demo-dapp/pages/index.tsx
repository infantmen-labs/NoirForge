import React from 'react';

import { Buffer } from 'buffer';

import Head from 'next/head';
import dynamic from 'next/dynamic';

import { ComputeBudgetProgram, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

import { createAssociatedTokenAccountInstruction, createTransferCheckedInstruction, getAssociatedTokenAddress, getMint } from '@solana/spl-token';

import { useRpcUrl } from './_app';

const WalletMultiButton = dynamic(
  async () => {
    const mod = await import('@solana/wallet-adapter-react-ui');
    return mod.WalletMultiButton;
  },
  { ssr: false }
);

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isStringOrNull(x: unknown): x is string | null {
  return typeof x === 'string' || x === null;
}

function basenameLike(p: string): string {
  const s = String(p);
  const parts = s.split(/[/\\]/g);
  const last = parts.length ? parts[parts.length - 1] : s;
  return last || s;
}

function extractExpectedFilesFromManifest(manifest: unknown): { proof: string | null; publicWitness: string | null } {
  if (!isPlainObject(manifest)) return { proof: null, publicWitness: null };
  const outputs = isPlainObject(manifest.outputs) ? (manifest.outputs as Record<string, unknown>) : null;
  const outputsRel = isPlainObject(manifest.outputs_rel) ? (manifest.outputs_rel as Record<string, unknown>) : null;

  const proof =
    (outputsRel && typeof outputsRel.proof === 'string' ? basenameLike(outputsRel.proof) : null) ||
    (outputs && typeof outputs.proof === 'string' ? basenameLike(outputs.proof) : null) ||
    null;

  const publicWitness =
    (outputsRel && typeof outputsRel.public_witness === 'string' ? basenameLike(outputsRel.public_witness) : null) ||
    (outputs && typeof outputs.public_witness === 'string' ? basenameLike(outputs.public_witness) : null) ||
    null;

  return { proof, publicWitness };
}

function extractProgramIdFromManifest(manifest: unknown): string | null {
  if (!isPlainObject(manifest)) return null;
  const outputs = manifest.outputs;
  if (!isPlainObject(outputs)) return null;

  const candidates = [
    (outputs as any).verify_onchain_program_id,
    (outputs as any).deployed_program_id,
    (outputs as any).program_id,
    (outputs as any).built_program_id,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 0) return c;
  }

  return null;
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function parsePublicWitnessBytes(publicWitnessBytes: Uint8Array): { header: Uint8Array; inputs: Uint8Array[] } {
  if (publicWitnessBytes.length < 12) {
    throw new Error('public witness too short');
  }
  const header = publicWitnessBytes.slice(0, 12);
  const rest = publicWitnessBytes.slice(12);
  if (rest.length % 32 !== 0) {
    throw new Error('public witness length must be 12 + 32*N');
  }
  const inputs: Uint8Array[] = [];
  for (let i = 0; i < rest.length; i += 32) {
    inputs.push(rest.slice(i, i + 32));
  }
  return { header, inputs };
}

function fieldChunkToBigintBE(chunk: Uint8Array): bigint {
  if (chunk.length !== 32) throw new Error('invalid field chunk length');
  const hex = Buffer.from(chunk).toString('hex');
  return BigInt(`0x${hex || '00'}`);
}

function bigintToFixedBytesBE(x: bigint, len: number): Uint8Array {
  if (x < 0n) throw new Error('negative bigint');
  const out = new Uint8Array(len);
  let v = x;
  for (let i = len - 1; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  if (v !== 0n) throw new Error('bigint does not fit in target length');
  return out;
}

function pubkeyFromTwo16ByteLimbs(limb0: bigint, limb1: bigint): PublicKey {
  const b0 = bigintToFixedBytesBE(limb0, 16);
  const b1 = bigintToFixedBytesBE(limb1, 16);
  const out = new Uint8Array(32);
  out.set(b0, 0);
  out.set(b1, 16);
  return new PublicKey(out);
}

function parseUiAmountToAmount(ui: string, decimals: number): bigint {
  const s = String(ui || '').trim();
  if (!s) throw new Error('Missing amount');
  if (!Number.isInteger(decimals) || decimals < 0) throw new Error('Invalid mint decimals');
  if (!/^[0-9]+(\.[0-9]+)?$/.test(s)) throw new Error('Invalid amount format');

  const [wholeRaw, fracRaw] = s.split('.');
  const whole = wholeRaw || '0';
  const frac = fracRaw || '';
  if (frac.length > decimals) throw new Error(`Too many decimal places (max ${decimals})`);

  const fracPadded = frac.padEnd(decimals, '0');
  const base = 10n ** BigInt(decimals);
  return BigInt(whole) * base + BigInt(fracPadded || '0');
}

function explorerTxUrl(signature: string, rpcUrl: string): string {
  const isDevnet = rpcUrl.includes('devnet');
  const isTestnet = rpcUrl.includes('testnet');
  const cluster = isDevnet ? 'devnet' : isTestnet ? 'testnet' : 'mainnet-beta';
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

export default function Home() {
  const { rpcUrl, setRpcUrl } = useRpcUrl();

  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [manifestText, setManifestText] = React.useState('');
  const [manifestProgramId, setManifestProgramId] = React.useState<string | null>(null);
  const [manifestName, setManifestName] = React.useState<string | null>(null);
  const [manifestCircuitDir, setManifestCircuitDir] = React.useState<string | null>(null);
  const [programIdOverride, setProgramIdOverride] = React.useState('');

  const [expectedProofFile, setExpectedProofFile] = React.useState<string | null>(null);
  const [expectedWitnessFile, setExpectedWitnessFile] = React.useState<string | null>(null);

  const [proofBytes, setProofBytes] = React.useState<Uint8Array | null>(null);
  const [witnessBytes, setWitnessBytes] = React.useState<Uint8Array | null>(null);

  const [status, setStatus] = React.useState<string>('');
  const [txSig, setTxSig] = React.useState<string>('');
  const [logs, setLogs] = React.useState<string[] | null>(null);

  const [tokenMint, setTokenMint] = React.useState('');
  const [tokenRecipient, setTokenRecipient] = React.useState('');
  const [tokenAmount, setTokenAmount] = React.useState('');

  const derivedTransfer = React.useMemo(() => {
    const isTransferManifest =
      (manifestCircuitDir && manifestCircuitDir.includes('private_transfer_authorization')) ||
      (manifestName && manifestName.includes('private_transfer'));

    if (!isTransferManifest) {
      return { transfer: null as null | { sender: PublicKey; recipient: PublicKey; mint: PublicKey; amountBase: bigint }, error: null as string | null };
    }
    if (!witnessBytes) return { transfer: null as null | { sender: PublicKey; recipient: PublicKey; mint: PublicKey; amountBase: bigint }, error: null as string | null };

    try {
      const pw = parsePublicWitnessBytes(witnessBytes);
      if (pw.inputs.length < 8) {
        return { transfer: null, error: null };
      }

      const sender0 = fieldChunkToBigintBE(pw.inputs[0]);
      const sender1 = fieldChunkToBigintBE(pw.inputs[1]);
      const recipient0 = fieldChunkToBigintBE(pw.inputs[2]);
      const recipient1 = fieldChunkToBigintBE(pw.inputs[3]);
      const mint0 = fieldChunkToBigintBE(pw.inputs[4]);
      const mint1 = fieldChunkToBigintBE(pw.inputs[5]);
      const amount = fieldChunkToBigintBE(pw.inputs[6]);

      const maxU64 = (1n << 64n) - 1n;
      if (amount <= 0n || amount > maxU64) {
        throw new Error('derived amount must be a positive u64');
      }

      const sender = pubkeyFromTwo16ByteLimbs(sender0, sender1);
      const recipient = pubkeyFromTwo16ByteLimbs(recipient0, recipient1);
      const mint = pubkeyFromTwo16ByteLimbs(mint0, mint1);

      return { transfer: { sender, recipient, mint, amountBase: amount }, error: null };
    } catch (e) {
      return { transfer: null, error: String(e) };
    }
  }, [witnessBytes, manifestName, manifestCircuitDir]);

  React.useEffect(() => {
    const t = derivedTransfer.transfer;
    if (!t) return;
    const mintStr = t.mint.toBase58();
    const recipientStr = t.recipient.toBase58();
    const amountStr = t.amountBase.toString();

    if (tokenMint !== mintStr) setTokenMint(mintStr);
    if (tokenRecipient !== recipientStr) setTokenRecipient(recipientStr);
    if (tokenAmount !== amountStr) setTokenAmount(amountStr);
  }, [derivedTransfer.transfer, tokenMint, tokenRecipient, tokenAmount]);

  const instructionData = React.useMemo(() => {
    if (!proofBytes || !witnessBytes) return null;
    return concatBytes(proofBytes, witnessBytes);
  }, [proofBytes, witnessBytes]);

  const effectiveProgramId = React.useMemo(() => {
    const override = programIdOverride.trim();
    if (override.length > 0) return override;
    return manifestProgramId;
  }, [programIdOverride, manifestProgramId]);

  async function loadManifestFromText(txt: string) {
    setManifestText(txt);
    setTxSig('');
    setLogs(null);

    try {
      const parsed = JSON.parse(txt);
      setManifestName(isPlainObject(parsed) && typeof (parsed as any).name === 'string' ? String((parsed as any).name) : null);
      setManifestCircuitDir(
        isPlainObject(parsed) && typeof (parsed as any).circuit_dir === 'string' ? String((parsed as any).circuit_dir) : null
      );
      const pid = extractProgramIdFromManifest(parsed);
      setManifestProgramId(pid);

      const expected = extractExpectedFilesFromManifest(parsed);
      setExpectedProofFile(expected.proof);
      setExpectedWitnessFile(expected.publicWitness);

      setStatus(pid ? 'Manifest loaded.' : 'Manifest loaded, but no program id found in outputs.');
    } catch (e) {
      setManifestProgramId(null);
      setManifestName(null);
      setManifestCircuitDir(null);
      setExpectedProofFile(null);
      setExpectedWitnessFile(null);
      setStatus(`Failed to parse manifest JSON: ${String(e)}`);
    }
  }

  async function submitVerify() {
    setTxSig('');
    setLogs(null);

    if (!publicKey) {
      setStatus('Connect a wallet first.');
      return;
    }

    if (!effectiveProgramId) {
      setStatus('Missing program id. Load a manifest with outputs.deployed_program_id (or set override).');
      return;
    }

    if (!instructionData) {
      setStatus('Upload both .proof and .pw first.');
      return;
    }

    let programKey: PublicKey;
    try {
      programKey = new PublicKey(effectiveProgramId);
    } catch (e) {
      setStatus(`Invalid program id: ${String(e)}`);
      return;
    }

    try {
      setStatus('Building transaction...');

      const ix = new TransactionInstruction({
        programId: programKey,
        keys: [],
        data: Buffer.from(instructionData),
      });

      const tx = new Transaction().add(ix);
      const latest = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = latest.blockhash;
      tx.feePayer = publicKey;

      setStatus('Requesting wallet signature...');
      const sig = await sendTransaction(tx, connection, { skipPreflight: false });

      setStatus('Confirming transaction...');
      const conf = await connection.confirmTransaction(
        { signature: sig, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
        'confirmed'
      );

      if (conf.value.err) {
        setTxSig(sig);
        setStatus(`Transaction confirmed with error: ${JSON.stringify(conf.value.err)}`);
        const txInfo = await connection.getTransaction(sig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
        setLogs(txInfo?.meta?.logMessages || null);
        return;
      }

      setTxSig(sig);
      setStatus('Success.');

      const txInfo = await connection.getTransaction(sig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
      setLogs(txInfo?.meta?.logMessages || null);
    } catch (e) {
      setStatus(`Submit failed: ${String(e)}`);
    }
  }

  async function submitVerifyAndTransfer() {
    setTxSig('');
    setLogs(null);

    if (!publicKey) {
      setStatus('Connect a wallet first.');
      return;
    }

    if (!effectiveProgramId) {
      setStatus('Missing program id. Load a manifest with outputs.deployed_program_id (or set override).');
      return;
    }

    if (!instructionData) {
      setStatus('Upload both .proof and .pw first.');
      return;
    }

    const derived = derivedTransfer.transfer;
    const mintStr = tokenMint.trim();
    const recipientStr = tokenRecipient.trim();
    const amountStr = tokenAmount.trim();

    if (derived) {
      if (!publicKey.equals(derived.sender)) {
        setStatus(`Proof sender does not match connected wallet. Proof sender=${derived.sender.toBase58()}`);
        return;
      }
    } else {
      if (!mintStr || !recipientStr || !amountStr) {
        setStatus('Fill mint, recipient, and amount.');
        return;
      }
    }

    let programKey: PublicKey;
    let mintKey: PublicKey;
    let recipientKey: PublicKey;
    try {
      programKey = new PublicKey(effectiveProgramId);
      mintKey = derived ? derived.mint : new PublicKey(mintStr);
      recipientKey = derived ? derived.recipient : new PublicKey(recipientStr);
    } catch (e) {
      setStatus(`Invalid pubkey: ${String(e)}`);
      return;
    }

    try {
      setStatus('Building verify + transfer transaction...');

      const mintInfo = await getMint(connection, mintKey, 'confirmed');
      const decimals = mintInfo.decimals;

      const amountBase = derived ? derived.amountBase : parseUiAmountToAmount(amountStr, decimals);
      if (amountBase <= 0n) {
        setStatus('Amount must be > 0');
        return;
      }

      const senderAta = await getAssociatedTokenAddress(mintKey, publicKey);
      const recipientAta = await getAssociatedTokenAddress(mintKey, recipientKey);

      const senderAtaInfo = await connection.getAccountInfo(senderAta, 'confirmed');
      if (!senderAtaInfo) {
        setStatus(`Sender has no associated token account for this mint: ${senderAta.toBase58()}`);
        return;
      }

      const recipientAtaInfo = await connection.getAccountInfo(recipientAta, 'confirmed');
      const maybeCreateRecipientAtaIx = recipientAtaInfo
        ? null
        : createAssociatedTokenAccountInstruction(publicKey, recipientAta, recipientKey, mintKey);

      const computeIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 });

      const verifyIx = new TransactionInstruction({
        programId: programKey,
        keys: [],
        data: Buffer.from(instructionData),
      });

      const transferIx = createTransferCheckedInstruction(senderAta, mintKey, recipientAta, publicKey, amountBase, decimals);

      const tx = new Transaction();
      tx.add(computeIx, verifyIx);
      if (maybeCreateRecipientAtaIx) tx.add(maybeCreateRecipientAtaIx);
      tx.add(transferIx);

      const latest = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = latest.blockhash;
      tx.feePayer = publicKey;

      setStatus('Requesting wallet signature...');
      const sig = await sendTransaction(tx, connection, { skipPreflight: false });

      setStatus('Confirming transaction...');
      const conf = await connection.confirmTransaction(
        { signature: sig, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
        'confirmed'
      );

      if (conf.value.err) {
        setTxSig(sig);
        setStatus(`Transaction confirmed with error: ${JSON.stringify(conf.value.err)}`);
        const txInfo = await connection.getTransaction(sig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
        setLogs(txInfo?.meta?.logMessages || null);
        return;
      }

      setTxSig(sig);
      setStatus('Success (verified + transferred).');

      const txInfo = await connection.getTransaction(sig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
      setLogs(txInfo?.meta?.logMessages || null);
    } catch (e) {
      setStatus(`Verify+transfer failed: ${String(e)}`);
    }
  }

  return (
    <>
      <Head>
        <title>NoirForge Demo dApp</title>
      </Head>

      <main style={{ maxWidth: 980, margin: '0 auto', padding: '2rem 1.25rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem' }}>NoirForge Demo dApp</h1>
            <div style={{ opacity: 0.85, marginTop: '0.35rem' }}>
              Wallet verify against a Sunspot-generated verifier program (devnet-first).
            </div>
          </div>
          <WalletMultiButton />
        </header>

        <section
          style={{
            marginTop: '1.25rem',
            padding: '1rem',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ display: 'block' }}>
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>RPC URL</div>
              <input
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(0,0,0,0.25)', color: 'inherit' }}
              />
            </label>

            <label style={{ display: 'block' }}>
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Program ID override (optional)</div>
              <input
                value={programIdOverride}
                onChange={(e) => setProgramIdOverride(e.target.value)}
                placeholder={manifestProgramId || 'From manifest outputs.deployed_program_id'}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(0,0,0,0.25)', color: 'inherit' }}
              />
            </label>
          </div>

          <div style={{ marginTop: '0.75rem', fontSize: 13, opacity: 0.9 }}>
            <div>
              <span style={{ opacity: 0.75 }}>Wallet:</span> {publicKey ? publicKey.toBase58() : 'not connected'}
            </div>
            <div>
              <span style={{ opacity: 0.75 }}>Effective program id:</span> {effectiveProgramId || '—'}
            </div>
            <div>
              <span style={{ opacity: 0.75 }}>instruction_data bytes:</span> {instructionData ? instructionData.length : '—'}
            </div>
          </div>
        </section>

        <section style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div
            style={{
              padding: '1rem',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '0.6rem' }}>1) Manifest (noirforge.json)</div>
            <textarea
              value={manifestText}
              onChange={(e) => loadManifestFromText(e.target.value)}
              placeholder="Paste noirforge.json here"
              style={{ width: '100%', minHeight: 180, padding: '0.75rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(0,0,0,0.25)', color: 'inherit', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12 }}
            />
            <div style={{ marginTop: '0.6rem' }}>
              <label style={{ display: 'inline-block', padding: '0.5rem 0.7rem', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 10, cursor: 'pointer' }}>
                Load JSON file
                <input
                  type="file"
                  accept="application/json,.json"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const f = e.target.files && e.target.files[0];
                    if (!f) return;
                    await loadManifestFromText(await f.text());
                  }}
                />
              </label>
            </div>
          </div>

          <div
            style={{
              padding: '1rem',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '0.6rem' }}>2) Proof + Public Witness</div>

            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Proof (*.proof)</div>
            {expectedProofFile ? (
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Expected: {expectedProofFile}</div>
            ) : null}
            <input
              type="file"
              onChange={async (e) => {
                const f = e.target.files && e.target.files[0];
                if (!f) return setProofBytes(null);
                const buf = await f.arrayBuffer();
                setProofBytes(new Uint8Array(buf));
              }}
            />

            <div style={{ marginTop: '0.75rem', fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Public witness (*.pw)</div>
            {expectedWitnessFile ? (
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Expected: {expectedWitnessFile}</div>
            ) : null}
            <input
              type="file"
              onChange={async (e) => {
                const f = e.target.files && e.target.files[0];
                if (!f) return setWitnessBytes(null);
                const buf = await f.arrayBuffer();
                setWitnessBytes(new Uint8Array(buf));
              }}
            />

            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={submitVerify}
                style={{ padding: '0.65rem 0.9rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(99,102,241,0.9)', color: 'white', cursor: 'pointer', fontWeight: 600 }}
              >
                Submit verify
              </button>

              <button
                type="button"
                onClick={submitVerifyAndTransfer}
                style={{ padding: '0.65rem 0.9rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(16,185,129,0.9)', color: 'white', cursor: 'pointer', fontWeight: 600 }}
              >
                Verify + Transfer (SPL)
              </button>

              <div style={{ fontSize: 13, opacity: 0.9 }}>{status}</div>
            </div>

            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <label style={{ display: 'block' }}>
                <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Token mint</div>
                <input
                  value={tokenMint}
                  onChange={(e) => setTokenMint(e.target.value)}
                  disabled={Boolean(derivedTransfer.transfer)}
                  placeholder="Mint address"
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(0,0,0,0.25)', color: 'inherit' }}
                />
              </label>

              <label style={{ display: 'block' }}>
                <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Recipient</div>
                <input
                  value={tokenRecipient}
                  onChange={(e) => setTokenRecipient(e.target.value)}
                  disabled={Boolean(derivedTransfer.transfer)}
                  placeholder="Recipient wallet address"
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(0,0,0,0.25)', color: 'inherit' }}
                />
              </label>

              <label style={{ display: 'block' }}>
                <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Amount</div>
                <input
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  disabled={Boolean(derivedTransfer.transfer)}
                  placeholder="e.g. 1.5"
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(0,0,0,0.25)', color: 'inherit' }}
                />
              </label>

              <div style={{ fontSize: 12, opacity: 0.75, alignSelf: 'end' }}>
                This submits a single transaction with: verify instruction → SPL token transfer.
                {derivedTransfer.error ? <div style={{ marginTop: 6 }}>Public witness parse error: {derivedTransfer.error}</div> : null}
              </div>
            </div>

            {txSig ? (
              <div style={{ marginTop: '0.75rem', fontSize: 13 }}>
                <div>
                  <span style={{ opacity: 0.75 }}>signature:</span> <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>{txSig}</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <a href={explorerTxUrl(txSig, rpcUrl)} target="_blank" rel="noreferrer">
                    View in Solana Explorer
                  </a>
                </div>
              </div>
            ) : null}

            {logs ? (
              <div style={{ marginTop: '0.9rem' }}>
                <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Logs</div>
                <pre
                  style={{
                    margin: 0,
                    padding: '0.75rem',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.18)',
                    background: 'rgba(0,0,0,0.25)',
                    overflowX: 'auto',
                    maxHeight: 240,
                    fontSize: 12,
                  }}
                >
                  {logs.join('\n')}
                </pre>
              </div>
            ) : null}
          </div>
        </section>

        <footer style={{ marginTop: '1.5rem', opacity: 0.75, fontSize: 12 }}>
          Tip: generate files with `pnpm noirforge init sum_a_b` then `pnpm noirforge prove ...` and use the resulting `.proof` and `.pw`.
        </footer>
      </main>
    </>
  );
}
