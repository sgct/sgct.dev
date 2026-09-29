import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import codeImport from 'remark-code-import';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'SGCT',
  tagline: 'Simple Graphics Cluster Toolkit',
  favicon: 'logo.webp',

  // https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true,
  },

  // Set the production url of your site here
  url: 'https://sgct.dev/',
  baseUrl: '/',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/SGCT/sgct.dev/',
          beforeDefaultRemarkPlugins: [codeImport],
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  // `import json from './x.json?raw'` has to hand the component the file's text, not
  // the parsed object webpack would otherwise produce for a .json import.
  plugins: [
    () => ({
      name: 'raw-asset-loader',
      configureWebpack: () => ({
        module: {rules: [{resourceQuery: /^\?raw$/, type: 'asset/source'}]},
      }),
    }),
  ],

  markdown: {
    mermaid: true
  },

  themes: [
    '@docusaurus/theme-mermaid',
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexBlog: false,
        explicitSearchResultPath: true,
        highlightSearchTermsOnTargetPage: true,
      },
    ]
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'SGCT',
      logo: {
        alt: 'SGCT Logo',
        src: 'logo.webp',
      },
      items: [
        {
          type: 'docSidebar',
          position: 'left',
          sidebarId: 'overviewSidebar',
          label: 'Overview',
        },
        {
          type: 'docSidebar',
          position: 'left',
          sidebarId: 'referenceSidebar',
          label: 'Reference',
        },
        {
          type: 'docSidebar',
          position: 'left',
          sidebarId: 'buildingSidebar',
          label: 'Building',
        },
        {
          type: 'docSidebar',
          position: 'left',
          sidebarId: 'examplesSidebar',
          label: 'Examples'
        }
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} SGCT. Licensed under 3-clause BSD license.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
