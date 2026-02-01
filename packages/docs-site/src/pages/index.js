import React from 'react';

import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

export default function Home() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <header className="hero hero--primary" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(11, 16, 32, 0.9)), url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
        <div className="container">
          <div style={{ textAlign: 'center', paddingBottom: '2rem' }}>
            <h1 className="hero__title" style={{ fontSize: '3.5rem', marginBottom: '1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              NoirForge
            </h1>
            <p className="hero__subtitle" style={{ fontSize: '1.25rem', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '70ch', marginLeft: 'auto', marginRight: 'auto' }}>
              {siteConfig.tagline}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem' }}>
              <Link className="button button--primary button--lg" to="/docs/intro">
                Get started
              </Link>
              <Link className="button button--secondary button--lg" to="/demo">
                Try the demo
              </Link>
              <Link className="button button--secondary button--lg" href="https://github.com/infantmen-labs/NoirForge">
                View source
              </Link>
            </div>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
              CLI-first toolchain. Reproducible flows. Production-ready.
            </p>
          </div>
        </div>
      </header>

      <main>
        <section style={{ padding: '4rem 1.25rem' }}>
          <div className="container">
            <div style={{ marginBottom: '3rem' }}>
              <h2 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 600 }}>The NoirForge Approach</h2>
              <p style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', maxWidth: '60ch', marginLeft: 'auto', marginRight: 'auto' }}>
                Built for developers who care about security, reproducibility, and production deployment.
              </p>
            </div>
            
            <div className="row" style={{ marginBottom: '2rem' }}>
              <div className="col col--4">
                <div style={{
                  padding: '1.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  backdropFilter: 'blur(8px)',
                  height: '100%'
                }}>
                  <h3 style={{ fontSize: '1.15rem', marginTop: 0, marginBottom: '0.75rem', fontWeight: 600 }}>CLI-first</h3>
                  <p style={{ lineHeight: 1.6, color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1rem', fontSize: '0.95rem' }}>
                    NoirForge's CLI is the source of truth for artifact layout, manifest semantics, and end-to-end reproducible flows.
                  </p>
                  <Link to="/docs/cli/overview" style={{ fontWeight: 500, color: 'var(--ifm-color-primary-light)' }}>Explore CLI →</Link>
                </div>
              </div>
              <div className="col col--4">
                <div style={{
                  padding: '1.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  backdropFilter: 'blur(8px)',
                  height: '100%'
                }}>
                  <h3 style={{ fontSize: '1.15rem', marginTop: 0, marginBottom: '0.75rem', fontWeight: 600 }}>TypeScript & Rust SDKs</h3>
                  <p style={{ lineHeight: 1.6, color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1rem', fontSize: '0.95rem' }}>
                    Load manifests, build instruction data, and submit verification transactions with language-specific SDKs.
                  </p>
                  <Link to="/docs/sdks/overview" style={{ fontWeight: 500, color: 'var(--ifm-color-primary-light)' }}>View SDKs →</Link>
                </div>
              </div>
              <div className="col col--4">
                <div style={{
                  padding: '1.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  backdropFilter: 'blur(8px)',
                  height: '100%'
                }}>
                  <h3 style={{ fontSize: '1.15rem', marginTop: 0, marginBottom: '0.75rem', fontWeight: 600 }}>Production Safe</h3>
                  <p style={{ lineHeight: 1.6, color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1rem', fontSize: '0.95rem' }}>
                    Toolchain pinning, SBOM/provenance, and explicit mainnet safety gates built in.
                  </p>
                  <Link to="/docs/operations/ci-and-releases" style={{ fontWeight: 500, color: 'var(--ifm-color-primary-light)' }}>Learn more →</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: '4rem 1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div className="container">
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 600 }}>Interactive Tools</h2>
              <p style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', maxWidth: '60ch', marginLeft: 'auto', marginRight: 'auto' }}>
                Browser-based utilities for manifests, proofs, and metrics.
              </p>
            </div>

            <div className="row">
              <div className="col col--6">
                <Link to="/demo" style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                  <div style={{
                    padding: '2rem',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    backdropFilter: 'blur(8px)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    height: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.25)';
                  }}>
                    <h3 style={{ fontSize: '1.2rem', marginTop: 0, marginBottom: '0.5rem', fontWeight: 600 }}>Live Demo</h3>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1rem' }}>
                      Validate manifests and build verifier instruction data in your browser.
                    </p>
                    <span style={{ color: 'var(--ifm-color-primary-light)', fontWeight: 500 }}>Open demo →</span>
                  </div>
                </Link>
              </div>

              <div className="col col--6">
                <Link to="/metrics" style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                  <div style={{
                    padding: '2rem',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    backdropFilter: 'blur(8px)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    height: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.25)';
                  }}>
                    <h3 style={{ fontSize: '1.2rem', marginTop: 0, marginBottom: '0.5rem', fontWeight: 600 }}>Metrics Dashboard</h3>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1rem' }}>
                      Analyze artifact sizes and compute history with interactive charts.
                    </p>
                    <span style={{ color: 'var(--ifm-color-primary-light)', fontWeight: 500 }}>View metrics →</span>
                  </div>
                </Link>
              </div>

              <div className="col col--6" style={{ marginTop: '1rem' }}>
                <Link to="/templates" style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                  <div style={{
                    padding: '2rem',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    backdropFilter: 'blur(8px)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    height: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.25)';
                  }}>
                    <h3 style={{ fontSize: '1.2rem', marginTop: 0, marginBottom: '0.5rem', fontWeight: 600 }}>Template Registry</h3>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1rem' }}>
                      Browse and initialize NoirForge project templates.
                    </p>
                    <span style={{ color: 'var(--ifm-color-primary-light)', fontWeight: 500 }}>Browse templates →</span>
                  </div>
                </Link>
              </div>

              <div className="col col--6" style={{ marginTop: '1rem' }}>
                <Link to="/playground" style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                  <div style={{
                    padding: '2rem',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    backdropFilter: 'blur(8px)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    height: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.25)';
                  }}>
                    <h3 style={{ fontSize: '1.2rem', marginTop: 0, marginBottom: '0.5rem', fontWeight: 600 }}>ZK Playground</h3>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1rem' }}>
                      Inspect artifacts, parse witnesses, and encode instructions.
                    </p>
                    <span style={{ color: 'var(--ifm-color-primary-light)', fontWeight: 500 }}>Try playground →</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
