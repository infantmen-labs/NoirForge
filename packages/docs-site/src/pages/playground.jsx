import React from 'react';

import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

import styles from './playground.module.css';

async function readFileBytes(file) {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

function concatBytes(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function toHex(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

function toBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function bytesToBigIntBE(bytes) {
  let x = 0n;
  for (let i = 0; i < bytes.length; i++) {
    x = (x << 8n) + BigInt(bytes[i]);
  }
  return x;
}

function parsePublicWitness(publicWitness) {
  if (!(publicWitness instanceof Uint8Array)) return { ok: false, error: 'public witness must be bytes' };
  if (publicWitness.length < 12) return { ok: false, error: 'public witness too short (need >= 12 bytes)' };

  const header = publicWitness.subarray(0, 12);
  const rest = publicWitness.subarray(12);
  if (rest.length % 32 !== 0) {
    return {
      ok: false,
      error: 'public witness length invalid (bytes after 12-byte header must be multiple of 32)',
    };
  }

  const count = rest.length / 32;
  const previewCount = Math.min(8, count);
  const preview = [];
  for (let i = 0; i < previewCount; i++) {
    const chunk = rest.subarray(i * 32, (i + 1) * 32);
    const bi = bytesToBigIntBE(chunk);
    preview.push({ idx: i, hex: toHex(chunk), decimal: bi.toString(10) });
  }

  return {
    ok: true,
    headerHex: toHex(header),
    inputCount: count,
    preview,
  };
}

function downloadBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function CopyButton({ text }) {
  const [state, setState] = React.useState('copy');

  return (
    <button
      className="button button--secondary button--sm"
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setState('copied');
        setTimeout(() => setState('copy'), 900);
      }}
      disabled={state === 'copied'}
    >
      {state === 'copied' ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function Playground() {
  const [proofFile, setProofFile] = React.useState(null);
  const [witnessFile, setWitnessFile] = React.useState(null);

  const [proofBytes, setProofBytes] = React.useState(null);
  const [witnessBytes, setWitnessBytes] = React.useState(null);

  const witnessParsed = React.useMemo(() => {
    if (!witnessBytes) return null;
    return parsePublicWitness(witnessBytes);
  }, [witnessBytes]);

  const instructionData = React.useMemo(() => {
    if (!proofBytes || !witnessBytes) return null;
    return concatBytes(proofBytes, witnessBytes);
  }, [proofBytes, witnessBytes]);

  const instructionDataHex = React.useMemo(() => {
    if (!instructionData) return null;
    return toHex(instructionData);
  }, [instructionData]);

  const instructionDataB64 = React.useMemo(() => {
    if (!instructionData) return null;
    return toBase64(instructionData);
  }, [instructionData]);

  return (
    <Layout title="Playground" description="Learn witness/proof/public inputs and instruction encoding">
      <div className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <h1 className={styles.title}>ZK Playground</h1>
            <p className={styles.subtitle}>
              Inspect NoirForge artifacts locally in your browser. Nothing is uploaded.
            </p>
            <div className={styles.row}>
              <Link className="button button--secondary button--sm" to="/docs/concepts/instruction-encoding">
                Instruction encoding
              </Link>
              <Link className="button button--secondary button--sm" to="/docs/concepts/artifacts-and-manifest">
                Artifacts
              </Link>
              <Link className="button button--secondary button--sm" to="/demo">
                Live demo
              </Link>
            </div>
          </header>

          <div className={styles.grid}>
            <section className={styles.card}>
              <div className={styles.cardTitle}>
                <h2>1) Public witness (.pw)</h2>
              </div>

              <div className={styles.small}>
                NoirForge public witness format: 12-byte header + N 32-byte field elements (big-endian).
              </div>

              <div style={{ marginTop: '0.75rem' }}>
                <div className={styles.small} style={{ marginBottom: '0.35rem' }}>
                  Public witness
                </div>
                <input
                  className={styles.file}
                  type="file"
                  onChange={async (e) => {
                    const f = e.target.files && e.target.files[0];
                    setWitnessFile(f || null);
                    setWitnessBytes(f ? await readFileBytes(f) : null);
                  }}
                />
                <div className={styles.small} style={{ marginTop: '0.35rem' }}>
                  {witnessFile ? `${witnessFile.name} (${witnessFile.size} bytes)` : 'No file selected'}
                </div>
              </div>

              {witnessParsed ? (
                witnessParsed.ok ? (
                  <div className={styles.badgeOk}>
                    <div className={styles.badgeTitle}>Parsed</div>
                    <div className={styles.kv}>
                      <div className={styles.k}>header_hex</div>
                      <div className={`${styles.v} ${styles.mono}`}>{witnessParsed.headerHex}</div>
                      <div className={styles.k}>field_elements</div>
                      <div className={`${styles.v} ${styles.mono}`}>{witnessParsed.inputCount}</div>
                    </div>

                    {Array.isArray(witnessParsed.preview) && witnessParsed.preview.length > 0 ? (
                      <div style={{ marginTop: '0.75rem' }}>
                        <div className={styles.badgeTitle}>First elements (preview)</div>
                        <div className={styles.tableWrap}>
                          <table className={styles.table}>
                            <thead>
                              <tr>
                                <th>idx</th>
                                <th>hex (32 bytes)</th>
                                <th>decimal (big-endian)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {witnessParsed.preview.map((row) => (
                                <tr key={row.idx}>
                                  <td className={styles.mono}>{row.idx}</td>
                                  <td className={styles.mono}>{row.hex}</td>
                                  <td className={styles.mono}>{row.decimal}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className={styles.badgeErr}>
                    <div className={styles.badgeTitle}>Parse error</div>
                    <div className={styles.small}>{witnessParsed.error}</div>
                  </div>
                )
              ) : null}
            </section>

            <section className={styles.card}>
              <div className={styles.cardTitle}>
                <h2>2) Instruction data</h2>
              </div>

              <div className={styles.small}>Build `instruction_data = proof_bytes || public_witness_bytes`.</div>

              <div style={{ marginTop: '0.75rem' }}>
                <div className={styles.small} style={{ marginBottom: '0.35rem' }}>
                  Proof
                </div>
                <input
                  className={styles.file}
                  type="file"
                  onChange={async (e) => {
                    const f = e.target.files && e.target.files[0];
                    setProofFile(f || null);
                    setProofBytes(f ? await readFileBytes(f) : null);
                  }}
                />
                <div className={styles.small} style={{ marginTop: '0.35rem' }}>
                  {proofFile ? `${proofFile.name} (${proofFile.size} bytes)` : 'No file selected'}
                </div>
              </div>

              <div style={{ marginTop: '0.75rem' }}>
                <div className={styles.small} style={{ marginBottom: '0.35rem' }}>
                  Public witness
                </div>
                <div className={styles.small}>
                  {witnessFile ? `Using ${witnessFile.name}` : 'Upload a .pw file in the left panel first.'}
                </div>
              </div>

              <div className={styles.outputBox}>
                <div className={styles.badgeTitle}>Summary</div>
                <div className={styles.kv}>
                  <div className={styles.k}>proof_bytes</div>
                  <div className={`${styles.v} ${styles.mono}`}>{proofBytes ? proofBytes.length : '-'}</div>
                  <div className={styles.k}>public_witness_bytes</div>
                  <div className={`${styles.v} ${styles.mono}`}>{witnessBytes ? witnessBytes.length : '-'}</div>
                  <div className={styles.k}>instruction_data_bytes</div>
                  <div className={`${styles.v} ${styles.mono}`}>{instructionData ? instructionData.length : '-'}</div>
                </div>

                <div className={styles.row}>
                  <button
                    className="button button--secondary button--sm"
                    type="button"
                    onClick={() => {
                      if (!instructionData) return;
                      downloadBytes(instructionData, 'instruction_data.bin');
                    }}
                    disabled={!instructionData}
                  >
                    Download
                  </button>
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                  <div className={styles.row} style={{ justifyContent: 'space-between' }}>
                    <div className={styles.small}>hex</div>
                    {instructionDataHex ? <CopyButton text={instructionDataHex} /> : null}
                  </div>
                  <div className={`${styles.outputText} ${styles.mono}`} style={{ marginTop: '0.35rem' }}>
                    {instructionDataHex ? `${instructionDataHex.slice(0, 120)}${instructionDataHex.length > 120 ? '…' : ''}` : '-'}
                  </div>
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                  <div className={styles.row} style={{ justifyContent: 'space-between' }}>
                    <div className={styles.small}>base64</div>
                    {instructionDataB64 ? <CopyButton text={instructionDataB64} /> : null}
                  </div>
                  <div className={`${styles.outputText} ${styles.mono}`} style={{ marginTop: '0.35rem' }}>
                    {instructionDataB64 ? `${instructionDataB64.slice(0, 120)}${instructionDataB64.length > 120 ? '…' : ''}` : '-'}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
