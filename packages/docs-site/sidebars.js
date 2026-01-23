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
      items: [
        'cli/overview',
        'cli/commands',
        {
          type: 'category',
          label: 'Command Reference',
          items: [
            'cli/command-init',
            'cli/command-test',
            'cli/command-compile',
            'cli/command-setup',
            'cli/command-build',
            'cli/command-prove',
            'cli/command-rerun-prove',
            'cli/command-verify-local',
            'cli/command-deploy',
            'cli/command-verify-onchain',
            'cli/command-simulate-onchain',
            'cli/command-bench',
            'cli/command-tx-stats',
            'cli/command-index-tx',
            'cli/command-index-program',
            'cli/command-report-index',
            'cli/command-doctor',
            'cli/command-help',
          ],
        },
      ],
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
