import React from 'react';

import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';

import styles from './templates.module.css';

function isPlainObject(x) {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function asStringArray(x) {
  if (!Array.isArray(x)) return [];
  return x.filter((v) => typeof v === 'string');
}

export default function Templates() {
  const [registry, setRegistry] = React.useState(null);
  const [loadErr, setLoadErr] = React.useState(null);
  const [query, setQuery] = React.useState('');
  const [selectedTags, setSelectedTags] = React.useState([]);

  const registryUrl = useBaseUrl('/template-registry.json');

  React.useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        setLoadErr(null);
        const res = await fetch(registryUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error(`failed to fetch template registry (HTTP ${res.status})`);
        const json = await res.json();
        if (!isPlainObject(json) || !Array.isArray(json.templates)) {
          throw new Error('invalid template registry format');
        }
        if (!canceled) setRegistry(json);
      } catch (e) {
        if (!canceled) setLoadErr(e && e.message ? e.message : String(e));
      }
    })();
    return () => {
      canceled = true;
    };
  }, [registryUrl]);

  const allTags = React.useMemo(() => {
    const tags = new Set();
    if (registry && Array.isArray(registry.templates)) {
      for (const t of registry.templates) {
        const tTags = asStringArray(t && t.tags);
        for (const tag of tTags) {
          tags.add(tag);
        }
      }
    }
    return Array.from(tags).sort();
  }, [registry]);

  const templates = React.useMemo(() => {
    const list = registry && Array.isArray(registry.templates) ? registry.templates : [];
    const q = query.trim().toLowerCase();

    return list.filter((t) => {
      const name = t && typeof t.name === 'string' ? t.name : '';
      const desc = t && typeof t.description === 'string' ? t.description : '';
      const tags = asStringArray(t && t.tags);
      
      // Check query match
      if (q) {
        const hay = [name, desc, ...tags].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      
      // Check tag filters
      if (selectedTags.length > 0) {
        const hasTag = selectedTags.some((tag) => tags.includes(tag));
        if (!hasTag) return false;
      }
      
      return true;
    });
  }, [registry, query, selectedTags]);

  return (
    <Layout title="Templates" description="NoirForge template registry">
      <div className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <h1 className={styles.title}>Templates</h1>
            <p className={styles.subtitle}>
              Browse NoirForge project templates. Pick one to bootstrap your setup.
            </p>

            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <input
                  className={styles.search}
                  placeholder="Search by name, tag, or description"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search templates"
                />
              </div>

              {allTags.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div className={styles.small} style={{ marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.6)' }}>Filter by tag:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setSelectedTags((prev) =>
                            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                          );
                        }}
                        style={{
                          padding: '0.4rem 0.8rem',
                          borderRadius: '999px',
                          border: `1px solid ${selectedTags.includes(tag) ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                          background: selectedTags.includes(tag) ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0, 0, 0, 0.2)',
                          color: selectedTags.includes(tag) ? 'rgba(59, 130, 246, 1)' : 'rgba(255, 255, 255, 0.8)',
                          fontSize: '0.85rem',
                          fontWeight: selectedTags.includes(tag) ? 500 : 400,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.row} style={{ gap: '0.5rem', marginTop: '1rem' }}>
                <Link className="button button--secondary button--sm" to="/docs/template-catalog">
                  Catalog
                </Link>
                <button
                  className="button button--secondary button--sm"
                  type="button"
                  onClick={() => {
                    if (typeof window === 'undefined') return;
                    window.open(registryUrl, '_blank', 'noopener,noreferrer');
                  }}
                >
                  registry.json
                </button>
              </div>
            </div>

            {loadErr ? <div className={styles.error}>load_error={loadErr}</div> : null}
          </header>

          <div className={styles.card} style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(0, 0, 0, 0.3))', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
            <div className={styles.small} style={{ color: 'rgba(59, 130, 246, 0.9)' }}>
              <strong>To initialize a template:</strong>
            </div>
            <div className={styles.mono} style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '8px', color: 'rgba(59, 130, 246, 0.95)' }}>
              pnpm noirforge init &lt;template_name&gt; &lt;dest_dir&gt;
            </div>
          </div>

          <div className={styles.grid}>
            {templates.map((t) => {
              const name = t && typeof t.name === 'string' ? t.name : 'unknown';
              const desc = t && typeof t.description === 'string' ? t.description : '';
              const tags = asStringArray(t && t.tags);
              const paths = t && isPlainObject(t.paths) ? t.paths : {};
              const templateDir = typeof paths.template_dir === 'string' ? paths.template_dir : null;
              const readme = typeof paths.readme === 'string' ? paths.readme : null;

              const repoUrl = templateDir
                ? `https://github.com/infantmen-labs/NoirForge/tree/main/${templateDir}`
                : 'https://github.com/infantmen-labs/NoirForge';
              const readmeUrl = readme ? `https://github.com/infantmen-labs/NoirForge/blob/main/${readme}` : repoUrl;

              return (
                <section key={name} className={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <h2 className={styles.templateName}>{name}</h2>
                      {desc ? <p className={styles.small} style={{ marginTop: '0.35rem', marginBottom: 0, color: 'rgba(255, 255, 255, 0.75)' }}>{desc}</p> : null}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <Link className="button button--secondary button--sm" href={repoUrl}>
                        Repo
                      </Link>
                      <Link className="button button--secondary button--sm" href={readmeUrl}>
                        Docs
                      </Link>
                    </div>
                  </div>

                  {tags.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                      {tags.map((tag) => (
                        <span key={tag} style={{
                          fontSize: '0.75rem',
                          borderRadius: '999px',
                          padding: '0.25rem 0.5rem',
                          border: '1px solid rgba(255, 255, 255, 0.16)',
                          background: 'rgba(0, 0, 0, 0.2)',
                          color: 'rgba(255, 255, 255, 0.7)',
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', padding: '0.75rem', borderLeft: '2px solid rgba(59, 130, 246, 0.3)' }}>
                    <div className={styles.small} style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.35rem' }}>init command:</div>
                    <div className={`${styles.mono}`} style={{ fontSize: '0.85rem', color: 'rgba(59, 130, 246, 0.95)', wordBreak: 'break-all' }}>
                      pnpm noirforge init {name} &lt;dest_dir&gt;
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
