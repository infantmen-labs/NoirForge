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

  const templates = React.useMemo(() => {
    const list = registry && Array.isArray(registry.templates) ? registry.templates : [];
    const q = query.trim().toLowerCase();
    if (!q) return list;

    return list.filter((t) => {
      const name = t && typeof t.name === 'string' ? t.name : '';
      const desc = t && typeof t.description === 'string' ? t.description : '';
      const tags = asStringArray(t && t.tags);
      const hay = [name, desc, ...tags].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [registry, query]);

  return (
    <Layout title="Templates" description="NoirForge template registry">
      <div className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <h1 className={styles.title}>Templates</h1>
            <p className={styles.subtitle}>
              Browse NoirForge templates using the static registry served from this site. Nothing is executed; this is metadata only.
            </p>

            <div className={styles.row} style={{ marginTop: '0.75rem' }}>
              <input
                className={styles.search}
                placeholder="Search by name, tag, or description"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Link className="button button--secondary button--sm" to="/docs/template-catalog">
                Template catalog
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

            {loadErr ? <div className={styles.error}>load_error={loadErr}</div> : null}
          </header>

          <div className={styles.card}>
            <div className={styles.small}>
              Install via:
              <span className={styles.mono} style={{ marginLeft: 8 }}>
                pnpm noirforge init &lt;template_name&gt; &lt;dest_dir&gt;
              </span>
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
                  <div className={styles.row} style={{ justifyContent: 'space-between' }}>
                    <h2 className={styles.templateName}>{name}</h2>
                    <div className={styles.row}>
                      <Link className="button button--secondary button--sm" href={repoUrl}>
                        Repo
                      </Link>
                      <Link className="button button--secondary button--sm" href={readmeUrl}>
                        README
                      </Link>
                    </div>
                  </div>

                  {desc ? <div className={styles.small} style={{ marginTop: '0.5rem' }}>{desc}</div> : null}

                  {tags.length > 0 ? (
                    <div className={styles.badges}>
                      {tags.map((tag) => (
                        <span key={tag} className={styles.badge}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className={styles.kv}>
                    <div className={styles.k}>init</div>
                    <div className={`${styles.v} ${styles.mono}`}>pnpm noirforge init {name} &lt;dest_dir&gt;</div>
                    <div className={styles.k}>template_dir</div>
                    <div className={`${styles.v} ${styles.mono}`}>{templateDir || '-'}</div>
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
