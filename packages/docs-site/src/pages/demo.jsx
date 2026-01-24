import React from 'react';

import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

import styles from './demo.module.css';

function isPlainObject(x) {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isStringRecordOrNull(x) {
  if (!isPlainObject(x)) return false;
  for (const v of Object.values(x)) {
    if (typeof v !== 'string' && v !== null) return false;
  }
  return true;
}

function isStringRecord(x) {
  if (!isPlainObject(x)) return false;
  for (const v of Object.values(x)) {
    if (typeof v !== 'string') return false;
  }
  return true;
}

function validateManifestV1(x) {
  const errors = [];

  if (!isPlainObject(x)) {
    return { ok: false, errors: ['manifest must be an object'] };
  }

  const schemaVersion = x.schema_version;
  if (schemaVersion !== 1) {
    errors.push('schema_version must be 1');
  }

  const name = x.name;
  if (typeof name !== 'string' || name.length === 0) {
    errors.push('name must be a non-empty string');
  }

  const createdAt = x.created_at;
  if (typeof createdAt !== 'string' || createdAt.length === 0) {
    errors.push('created_at must be a non-empty string');
  }

  const circuitDir = x.circuit_dir;
  if (typeof circuitDir !== 'string' && circuitDir !== null) {
    errors.push('circuit_dir must be a string or null');
  }

  const provingSystem = x.proving_system;
  if (typeof provingSystem !== 'string' || provingSystem.length === 0) {
    errors.push('proving_system must be a non-empty string');
  }

  const outputs = x.outputs;
  if (!isStringRecordOrNull(outputs)) {
    errors.push('outputs must be an object whose values are string|null');
  }

  const outputsRel = x.outputs_rel;
  if (outputsRel != null && !isStringRecordOrNull(outputsRel)) {
    errors.push('outputs_rel must be an object whose values are string|null');
  }

  const hashes = x.hashes;
  if (hashes != null && !isStringRecord(hashes)) {
    errors.push('hashes must be an object whose values are string');
  }

  const toolchain = x.toolchain;
  if (toolchain != null && !isStringRecord(toolchain)) {
    errors.push('toolchain must be an object whose values are string');
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, manifest: x };
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

async function readFileBytes(file) {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
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

function parsePublicWitness(publicWitness) {
  if (publicWitness.length < 12) return { ok: false, error: 'public witness too short (need >= 12 bytes)' };
  const rest = publicWitness.subarray(12);
  if (rest.length % 32 !== 0) {
    return {
      ok: false,
      error: 'public witness length invalid (bytes after 12-byte header must be multiple of 32)',
    };
  }
  return { ok: true, headerHex: toHex(publicWitness.subarray(0, 12)), inputCount: rest.length / 32 };
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

export default function Demo() {
  const [manifestText, setManifestText] = React.useState('');
  const [manifestOk, setManifestOk] = React.useState(null);

  const [proofFile, setProofFile] = React.useState(null);
  const [witnessFile, setWitnessFile] = React.useState(null);

  const [proofBytes, setProofBytes] = React.useState(null);
  const [witnessBytes, setWitnessBytes] = React.useState(null);

  const instructionData = React.useMemo(() => {
    if (!proofBytes || !witnessBytes) return null;
    return concatBytes(proofBytes, witnessBytes);
  }, [proofBytes, witnessBytes]);

  const witnessParsed = React.useMemo(() => {
    if (!witnessBytes) return null;
    return parsePublicWitness(witnessBytes);
  }, [witnessBytes]);

  const instructionDataHex = React.useMemo(() => {
    if (!instructionData) return null;
    return toHex(instructionData);
  }, [instructionData]);

  const instructionDataB64 = React.useMemo(() => {
    if (!instructionData) return null;
    return toBase64(instructionData);
  }, [instructionData]);

  return (
    <Layout title="Demo" description="NoirForge live demo">
      <div className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <h1 className={styles.title}>NoirForge Live Demo</h1>
            <p className={styles.subtitle}>
              Validate a NoirForge manifest and build verifier instruction data in the browser. Nothing is uploaded.
            </p>
            <div style={{ marginTop: '0.75rem' }}>
              <Link className="button button--secondary button--sm" to="/docs/getting-started/live-demo">
                How to use this demo
              </Link>
            </div>
          </header>

          <div className={styles.grid}>
            <section className={styles.card}>
              <div className={styles.cardTitle}>
                <h2>1) Manifest (noirforge.json)</h2>
              </div>

              <textarea
                className={`${styles.textarea} ${styles.mono}`}
                placeholder="Paste noirforge.json"
                value={manifestText}
                onChange={(e) => setManifestText(e.target.value)}
              />

              <div className={styles.row}>
                <button
                  className="button button--primary button--sm"
                  type="button"
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(manifestText || '');
                      const v = validateManifestV1(parsed);
                      setManifestOk(v);
                    } catch (e) {
                      setManifestOk({ ok: false, errors: [String(e)] });
                    }
                  }}
                >
                  Validate
                </button>

                <label className="button button--secondary button--sm" style={{ margin: 0 }}>
                  Load JSON file
                  <input
                    type="file"
                    accept="application/json,.json"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const f = e.target.files && e.target.files[0];
                      if (!f) return;
                      const txt = await f.text();
                      setManifestText(txt);
                      setManifestOk(null);
                    }}
                  />
                </label>
              </div>

              {manifestOk && !manifestOk.ok && (
                <div className={styles.badgeErr}>
                  <div className={styles.badgeTitle}>Manifest errors</div>
                  <ul>
                    {manifestOk.errors.map((err, idx) => (
                      <li key={idx} className={styles.small}>
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {manifestOk && manifestOk.ok && (
                <div className={styles.badgeOk}>
                  <div className={styles.badgeTitle}>Valid manifest v1</div>
                  <div className={styles.kv}>
                    <div className={styles.k}>name</div>
                    <div className={`${styles.v} ${styles.mono}`}>{manifestOk.manifest.name}</div>
                    <div className={styles.k}>created_at</div>
                    <div className={`${styles.v} ${styles.mono}`}>{manifestOk.manifest.created_at}</div>
                    <div className={styles.k}>proving_system</div>
                    <div className={`${styles.v} ${styles.mono}`}>{manifestOk.manifest.proving_system}</div>
                    <div className={styles.k}>outputs keys</div>
                    <div className={`${styles.v} ${styles.mono}`}>{Object.keys(manifestOk.manifest.outputs || {}).length}</div>
                  </div>
                </div>
              )}
            </section>

            <section className={styles.card}>
              <div className={styles.cardTitle}>
                <h2>2) Proof + Public Witness</h2>
              </div>

              <div className={styles.small}>Upload your artifact files (usually `*.proof` and `*.pw`).</div>

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

              {witnessParsed && (
                <div className={witnessParsed.ok ? styles.badgeOk : styles.badgeErr}>
                  <div className={styles.badgeTitle}>Public witness parse</div>
                  {witnessParsed.ok ? (
                    <div className={styles.kv}>
                      <div className={styles.k}>header (12 bytes)</div>
                      <div className={`${styles.v} ${styles.mono}`}>{witnessParsed.headerHex}</div>
                      <div className={styles.k}>inputs</div>
                      <div className={`${styles.v} ${styles.mono}`}>{witnessParsed.inputCount}</div>
                    </div>
                  ) : (
                    <div className={styles.small}>{witnessParsed.error}</div>
                  )}
                </div>
              )}

              <div className={styles.outputBox}>
                <div className={styles.outputLine}>
                  <div>
                    <div className={styles.badgeTitle} style={{ marginBottom: 0 }}>
                      instruction_data
                    </div>
                    <div className={styles.small}>proof_bytes || public_witness_bytes</div>
                  </div>

                  <div className={styles.actions}>
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
                </div>

                <div className={styles.kv} style={{ marginTop: '0.75rem' }}>
                  <div className={styles.k}>bytes</div>
                  <div className={`${styles.v} ${styles.mono}`}>{instructionData ? instructionData.length : '-'}</div>
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                  <div className={styles.outputLine}>
                    <div className={styles.small}>hex</div>
                    {instructionDataHex ? <CopyButton text={instructionDataHex} /> : null}
                  </div>
                  <div className={`${styles.outputText} ${styles.mono}`} style={{ marginTop: '0.35rem' }}>
                    {instructionDataHex ? `${instructionDataHex.slice(0, 96)}${instructionDataHex.length > 96 ? '…' : ''}` : '-'}
                  </div>
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                  <div className={styles.outputLine}>
                    <div className={styles.small}>base64</div>
                    {instructionDataB64 ? <CopyButton text={instructionDataB64} /> : null}
                  </div>
                  <div className={`${styles.outputText} ${styles.mono}`} style={{ marginTop: '0.35rem' }}>
                    {instructionDataB64 ? `${instructionDataB64.slice(0, 96)}${instructionDataB64.length > 96 ? '…' : ''}` : '-'}
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
