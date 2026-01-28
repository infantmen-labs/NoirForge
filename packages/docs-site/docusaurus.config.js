const path = require('node:path');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'NoirForge',
  tagline: 'Noir + Sunspot pipeline, Solana deploy, and proof verification tooling',
  url: 'https://noirforge.not',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  favicon: 'img/favicon.svg',

  organizationName: 'infantmen-labs',
  projectName: 'NoirForge',

  presets: [
    [
      'classic',
      {
        docs: {
          path: path.resolve(__dirname, '../../docs'),
          routeBasePath: 'docs',
          sidebarPath: require.resolve('./sidebars.js'),
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'NoirForge',
      items: [
        { to: '/docs/intro', label: 'Docs', position: 'left' },
        { to: '/demo', label: 'Demo', position: 'left' },
        { to: '/metrics', label: 'Metrics', position: 'left' },
        { to: '/templates', label: 'Templates', position: 'left' },
        {
          href: 'https://github.com/infantmen-labs/NoirForge',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Introduction', to: '/docs/intro' },
            { label: 'CLI', to: '/docs/cli/overview' },
            { label: 'SDKs', to: '/docs/sdks/overview' },
          ],
        },
        {
          title: 'Packages',
          items: [
            { label: '@noirforge/cli', href: 'https://www.npmjs.com/package/@noirforge/cli/v/0.1.0-rc.2' },
            { label: '@noirforge/sdk', href: 'https://www.npmjs.com/package/@noirforge/sdk/v/0.1.0-rc.2' },
            { label: '@noirforge/core', href: 'https://www.npmjs.com/package/@noirforge/core/v/0.1.0-rc.2' },
            { label: 'noirforge-sdk (Rust)', href: 'https://crates.io/crates/noirforge-sdk' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} NoirForge`,
    },
  },
};

module.exports = config;
