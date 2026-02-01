import React from 'react';

import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

import styles from './metrics.module.css';

async function readFileBytes(file) {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

async function readFileText(file) {
  return await file.text();
}

function isPlainObject(x) {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function parseComputeJsonl(txt) {
  const records = [];
  const lines = String(txt || '').split(/\r?\n/);
  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;
    try {
      const o = JSON.parse(l);
      if (!isPlainObject(o)) continue;
      if (o.kind !== 'noirforge_simulate') continue;
      const at = typeof o.simulated_at === 'string' ? o.simulated_at : null;
      const cu = typeof o.compute_units_consumed === 'number' ? o.compute_units_consumed : null;
      const ok = typeof o.ok === 'boolean' ? o.ok : null;
      const programId = typeof o.program_id === 'string' ? o.program_id : null;
      const cluster = typeof o.cluster === 'string' ? o.cluster : null;
      records.push({ simulated_at: at, compute_units_consumed: cu, ok, program_id: programId, cluster });
    } catch {
    }
  }

  records.sort((a, b) => {
    const ta = a.simulated_at ? Date.parse(a.simulated_at) : 0;
    const tb = b.simulated_at ? Date.parse(b.simulated_at) : 0;
    return ta - tb;
  });

  return records;
}

function Sparkline({ values, width, height }) {
  const w = typeof width === 'number' && width > 0 ? width : 320;
  const h = typeof height === 'number' && height > 0 ? height : 64;

  const nums = (Array.isArray(values) ? values : []).filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (nums.length < 2) {
    return (
      <div className={styles.sparklineEmpty}>
        <div className={styles.small}>Not enough data</div>
      </div>
    );
  }

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;

  const pts = nums
    .map((v, i) => {
      const x = (i / (nums.length - 1)) * (w - 2) + 1;
      const y = h - 1 - ((v - min) / span) * (h - 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg className={styles.sparkline} viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label="compute units sparkline">
      <polyline points={pts} fill="none" stroke="rgba(59,130,246,0.95)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function Metrics() {
  const [proofFile, setProofFile] = React.useState(null);
  const [witnessFile, setWitnessFile] = React.useState(null);
  const [proofBytes, setProofBytes] = React.useState(null);
  const [witnessBytes, setWitnessBytes] = React.useState(null);

  const [computeFile, setComputeFile] = React.useState(null);
  const [computeText, setComputeText] = React.useState('');
  const [computeParseErr, setComputeParseErr] = React.useState(null);

  const instructionDataBytes = React.useMemo(() => {
    if (!proofBytes || !witnessBytes) return null;
    return proofBytes.length + witnessBytes.length;
  }, [proofBytes, witnessBytes]);

  const computeRecords = React.useMemo(() => {
    try {
      setComputeParseErr(null);
      return parseComputeJsonl(computeText);
    } catch (e) {
      setComputeParseErr(String(e));
      return [];
    }
  }, [computeText]);

  const computeValues = React.useMemo(() => {
    return computeRecords.map((r) => r.compute_units_consumed).filter((v) => typeof v === 'number' && Number.isFinite(v));
  }, [computeRecords]);

  const computeSummary = React.useMemo(() => {
    if (computeValues.length === 0) return null;
    const min = Math.min(...computeValues);
    const max = Math.max(...computeValues);
    const last = computeValues[computeValues.length - 1];
    return { min, max, last, count: computeValues.length };
  }, [computeValues]);

  const recent = React.useMemo(() => {
    const out = [...computeRecords];
    out.reverse();
    return out.slice(0, 20);
  }, [computeRecords]);

  return (
    <Layout title="Metrics" description="Artifact sizes and compute history">
      <div className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <h1 className={styles.title}>NoirForge Metrics</h1>
            <p className={styles.subtitle}>Visualize proof/pw sizes and compute history locally. Nothing is uploaded.</p>
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link className="button button--secondary button--sm" to="/docs/cli/commands">
                CLI docs
              </Link>
              <Link className="button button--secondary button--sm" to="/docs/cli/commands/compute-analyze">
                compute-analyze
              </Link>
              <Link className="button button--secondary button--sm" to="/docs/cli/commands/sizes">
                sizes
              </Link>
            </div>
          </header>

          <div className={styles.grid}>
            <section className={styles.card}>
              <div className={styles.cardTitle}>
                <h2>1) Artifact sizes</h2>
              </div>

              <div className={styles.small}>Upload your `*.proof` and `*.pw` files to compute sizes.</div>

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

              <div className={styles.outputBox}>
                <div className={styles.badgeTitle}>Derived sizes</div>
                <div className={styles.kv}>
                  <div className={styles.k}>proof_bytes</div>
                  <div className={`${styles.v} ${styles.mono}`}>{proofBytes ? proofBytes.length : '-'}</div>
                  <div className={styles.k}>public_witness_bytes</div>
                  <div className={`${styles.v} ${styles.mono}`}>{witnessBytes ? witnessBytes.length : '-'}</div>
                  <div className={styles.k}>instruction_data_bytes</div>
                  <div className={`${styles.v} ${styles.mono}`}>{instructionDataBytes != null ? instructionDataBytes : '-'}</div>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardTitle}>
                <h2>2) Compute history</h2>
              </div>

              <div className={styles.small}>
                Upload or paste `noirforge-compute.jsonl` from `noirforge compute-analyze`.
              </div>

              <div className={styles.row}>
                <label className="button button--secondary button--sm" style={{ margin: 0 }}>
                  Load JSONL file
                  <input
                    type="file"
                    accept="application/jsonl,.jsonl,application/json,.txt"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const f = e.target.files && e.target.files[0];
                      setComputeFile(f || null);
                      if (!f) return;
                      const txt = await readFileText(f);
                      setComputeText(txt);
                    }}
                  />
                </label>

                <button
                  className="button button--secondary button--sm"
                  type="button"
                  onClick={() => {
                    setComputeFile(null);
                    setComputeText('');
                    setComputeParseErr(null);
                  }}
                >
                  Clear
                </button>
              </div>

              <textarea
                className={`${styles.textarea} ${styles.mono}`}
                placeholder="Paste JSONL (one JSON object per line)"
                value={computeText}
                onChange={(e) => setComputeText(e.target.value)}
              />

              {computeParseErr ? <div className={styles.badgeErr}>parse_error={computeParseErr}</div> : null}

              <div className={styles.outputBox}>
                <div className={styles.outputLine}>
                  <div>
                    <div className={styles.badgeTitle} style={{ marginBottom: 0 }}>
                      Compute units
                    </div>
                    <div className={styles.small}>{computeFile ? computeFile.name : 'no file loaded'}</div>
                  </div>
                </div>

                {computeSummary ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', padding: '0.75rem', borderLeft: '3px solid rgba(59, 130, 246, 0.5)' }}>
                      <div className={styles.small} style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.25rem' }}>Count</div>
                      <div className={`${styles.mono}`} style={{ fontSize: '1.2rem', color: 'rgba(59, 130, 246, 0.95)', fontWeight: 600 }}>{computeSummary.count}</div>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', padding: '0.75rem', borderLeft: '3px solid rgba(16, 185, 129, 0.5)' }}>
                      <div className={styles.small} style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.25rem' }}>Min</div>
                      <div className={`${styles.mono}`} style={{ fontSize: '1.2rem', color: 'rgba(16, 185, 129, 0.95)', fontWeight: 600 }}>{computeSummary.min}</div>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', padding: '0.75rem', borderLeft: '3px solid rgba(239, 68, 68, 0.5)' }}>
                      <div className={styles.small} style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.25rem' }}>Max</div>
                      <div className={`${styles.mono}`} style={{ fontSize: '1.2rem', color: 'rgba(239, 68, 68, 0.95)', fontWeight: 600 }}>{computeSummary.max}</div>
                    </div>
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', padding: '0.75rem', borderLeft: '3px solid rgba(245, 158, 11, 0.5)' }}>
                      <div className={styles.small} style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.25rem' }}>Latest</div>
                      <div className={`${styles.mono}`} style={{ fontSize: '1.2rem', color: 'rgba(245, 158, 11, 0.95)', fontWeight: 600 }}>{computeSummary.last}</div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.small} style={{ marginTop: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    No compute history loaded.
                  </div>
                )}

                <div style={{ marginTop: '0.75rem' }}>
                  <Sparkline values={computeValues} width={360} height={72} />
                </div>

                {recent.length > 0 ? (
                  <div style={{ marginTop: '1rem' }}>
                    <div className={styles.badgeTitle} style={{ marginBottom: '0.75rem' }}>Recent runs</div>
                    <div className={styles.tableWrap} style={{ borderRadius: '10px' }}>
                      <table className={styles.table} style={{ fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: 'rgba(0, 0, 0, 0.35)' }}>
                            <th style={{ textAlign: 'left', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)' }}>Time</th>
                            <th style={{ textAlign: 'left', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)' }}>Cluster</th>
                            <th style={{ textAlign: 'right', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)' }}>Compute Units</th>
                            <th style={{ textAlign: 'center', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recent.map((r, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: idx % 2 === 0 ? 'transparent' : 'rgba(0, 0, 0, 0.15)' }}>
                              <td className={styles.mono} style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.8rem' }}>{r.simulated_at ? new Date(r.simulated_at).toLocaleString() : '-'}</td>
                              <td style={{ color: 'rgba(255, 255, 255, 0.75)' }}>{r.cluster || '-'}</td>
                              <td className={styles.mono} style={{ textAlign: 'right', color: 'rgba(59, 130, 246, 0.9)' }}>{r.compute_units_consumed == null ? '-' : r.compute_units_consumed.toLocaleString()}</td>
                              <td style={{ textAlign: 'center', color: r.ok ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)', fontWeight: 500 }}>{r.ok == null ? '-' : r.ok ? '✓' : '✗'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
