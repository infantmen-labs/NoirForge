/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: ['getting-started/quickstart', 'getting-started/devnet-demo'],
    },
    {
      type: 'category',
      label: 'Concepts',
      items: ['concepts/artifacts-and-manifest', 'concepts/instruction-encoding'],
    },
    {
      type: 'category',
      label: 'CLI',
      items: ['cli/overview', 'cli/commands'],
    },
    {
      type: 'category',
      label: 'SDKs',
      items: ['sdks/overview', 'sdks/typescript', 'sdks/rust'],
    },
    {
      type: 'category',
      label: 'Operations',
      items: ['operations/ci-and-releases', 'operations/mainnet'],
    },
    {
      type: 'category',
      label: 'Security',
      items: ['security/overview', 'threat-model', 'key-management', 'dependency-policy'],
    },
    {
      type: 'category',
      label: 'Reference',
      items: ['template-catalog', 'troubleshooting', 'sdk-usage', 'mainnet-readiness', 'mainnet-runbook', 'living-spec'],
    },
  ],
};

module.exports = sidebars;
