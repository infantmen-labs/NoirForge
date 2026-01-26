import React from 'react';

import { Buffer } from 'buffer';

import Head from 'next/head';
import dynamic from 'next/dynamic';

import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

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
  const [programIdOverride, setProgramIdOverride] = React.useState('');

  const [expectedProofFile, setExpectedProofFile] = React.useState<string | null>(null);
  const [expectedWitnessFile, setExpectedWitnessFile] = React.useState<string | null>(null);

  const [proofBytes, setProofBytes] = React.useState<Uint8Array | null>(null);
  const [witnessBytes, setWitnessBytes] = React.useState<Uint8Array | null>(null);

  const [status, setStatus] = React.useState<string>('');
  const [txSig, setTxSig] = React.useState<string>('');
  const [logs, setLogs] = React.useState<string[] | null>(null);

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
      const pid = extractProgramIdFromManifest(parsed);
      setManifestProgramId(pid);

      const expected = extractExpectedFilesFromManifest(parsed);
      setExpectedProofFile(expected.proof);
      setExpectedWitnessFile(expected.publicWitness);

      setStatus(pid ? 'Manifest loaded.' : 'Manifest loaded, but no program id found in outputs.');
    } catch (e) {
      setManifestProgramId(null);
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

              <div style={{ fontSize: 13, opacity: 0.9 }}>{status}</div>
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
