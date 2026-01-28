# Docs site

NoirForge includes a Docusaurus v3 documentation UI under `packages/docs-site/`.

## Local development

- Start dev server:

```bash
pnpm docs:start
```

The docs site includes two interactive pages:

- `/demo`: browser-only manifest validation + instruction encoding
- `/metrics`: browser-only visualization for artifact sizes and compute history

- Build production static site:

```bash
pnpm docs:build
```

## Metrics page

The `/metrics` page is designed to work with local artifact outputs (nothing is uploaded).

To generate inputs:

- Proof/pw sizes:

```bash
pnpm noirforge sizes --artifact-name <artifact_name>
```

- Compute history JSONL:

```bash
pnpm noirforge compute-analyze --artifact-name <artifact_name> --cluster devnet --payer ~/.config/solana/id.json
```

Then open `/metrics` and upload:

- `<name>.proof` and `<name>.pw` (for sizes)
- `noirforge-compute.jsonl` (for compute history)

- Serve the production build locally:

```bash
pnpm docs:serve
```

## Output directory

The production build is written to:

- `packages/docs-site/build/`

You can deploy this directory to any static host.

## Recommended deployment: GitHub Pages

GitHub Pages is a good default because it is simple and keeps docs close to the repo.

1) Decide the docs URL and base path.

- If you host at `https://<org>.github.io/<repo>/`, set:
  - `url: 'https://<org>.github.io'`
  - `baseUrl: '/<repo>/'`

- If you host at a custom domain root, keep `baseUrl: '/'`.

These are configured in `packages/docs-site/docusaurus.config.js`.

2) Build the site:

```bash
pnpm docs:build
```

3) Publish `packages/docs-site/build/` to GitHub Pages.

A typical GitHub Actions approach is:

- Build on `main`
- Upload `packages/docs-site/build/` as a Pages artifact
- Deploy using the GitHub Pages deploy action

## Alternatives

### Netlify

- Build command: `pnpm docs:build`
- Publish directory: `packages/docs-site/build`

### Vercel

- Build command: `pnpm docs:build`
- Output directory: `packages/docs-site/build`

## Broken link policy

The docs site build is configured to fail on broken links.

If you add new pages, ensure sidebars and internal links match the final route paths, then verify with:

```bash
pnpm docs:build
```
