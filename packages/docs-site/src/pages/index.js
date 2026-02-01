import React from 'react';

import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

export default function Home() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <header className="hero hero--primary">
        <div className="container">
          <h1 className="hero__title">NoirForge</h1>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="button button--secondary button--lg" to="/docs/intro">
              Read the docs
            </Link>
            <Link className="button button--outline button--lg" to="/demo">
              Live demo
            </Link>
            <Link className="button button--outline button--lg" to="/docs/getting-started/quickstart">
              Quickstart
            </Link>
            <Link className="button button--outline button--lg" href="https://github.com/infantmen-labs/NoirForge">
              View on GitHub
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="container" style={{ padding: '2rem 1.25rem' }}>
          <div className="row">
            <div className="col col--4">
              <h2 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: '0.5rem' }}>CLI-first</h2>
              <p style={{ lineHeight: '1.6', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1rem' }}>
                NoirForge's CLI is the source of truth for artifact layout, manifest semantics, and end-to-end reproducible
                flows.
              </p>
              <Link to="/docs/cli/overview" style={{ fontWeight: 500 }}>CLI docs →</Link>
            </div>
            <div className="col col--4">
              <h2 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: '0.5rem' }}>SDKs</h2>
              <p style={{ lineHeight: '1.6', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1rem' }}>
                TypeScript and Rust SDKs help you load manifests, build instruction data, and submit verification
                transactions.
              </p>
              <Link to="/docs/sdks/overview" style={{ fontWeight: 500 }}>SDK docs →</Link>
            </div>
            <div className="col col--4">
              <h2 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: '0.5rem' }}>Production posture</h2>
              <p style={{ lineHeight: '1.6', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1rem' }}>
                Toolchain pinning, SBOM/provenance, and explicit mainnet safety gates are part of NoirForge's operating
                model.
              </p>
              <Link to="/docs/operations/ci-and-releases" style={{ fontWeight: 500 }}>CI & releases →</Link>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
