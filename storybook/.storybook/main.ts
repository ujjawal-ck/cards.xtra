import type { StorybookConfig } from '@storybook/react-native-web-vite';
import path from 'node:path';
import remarkGfm from 'remark-gfm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');          // app repo root
const nm = (p: string) => path.join(root, 'node_modules', p);
const mock = (f: string) => path.resolve(here, '../mocks', f);

// Inline .svg files as react-native-svg components (the app uses react-native-svg-transformer).
const svgAsRnComponent = {
  name: 'svg-as-rn-component',
  enforce: 'pre' as const,
  async load(id: string) {
    if (!id.endsWith('.svg')) return null;
    const fs = await import('node:fs/promises');
    const xml = (await fs.readFile(id, 'utf8')).replace(/#262626/g, 'currentColor');
    return `import React from 'react'; import { SvgXml } from 'react-native-svg';
const xml = ${JSON.stringify(xml)};
export default function Svg(props) { return React.createElement(SvgXml, { xml, ...props }); }
Svg.default = Svg;`;
  },
};


// Metro lets source call require('./x.png'). Vite does not, so hoist those into imports.
const requireAssetsToImports = {
  name: 'require-assets-to-imports',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!/\/(src|stories|@expo-google-fonts)\//.test(id) || !code.includes('require(')) return null;
    const re = /require\(\s*(['"])((?:\.{1,2}\/|@)[^'"]+\.(?:png|jpe?g|webp|gif|svg|ttf|otf|riv|lottie|json|mp4))\1\s*\)(\.default)?/g;
    const imports: string[] = [];
    const seen = new Map<string, string>();
    const out = code.replace(re, (_m, _q, spec, _dflt) => {
      let name = seen.get(spec);
      if (!name) { name = `__sbAsset${seen.size}`; seen.set(spec, name); imports.push(`import ${name} from ${JSON.stringify(spec)};`); }
      return name;
    });
    if (!imports.length) return null;
    return { code: imports.join('\n') + '\n' + out, map: null };
  },
};


// Reanimated reads react-native-web's style compiler with require() inside try/catch.
// Under Vite that require is undefined, so every animated style throws. Give it real imports.
const reanimatedWebUtils = {
  name: 'reanimated-web-utils',
  enforce: 'pre' as const,
  load(id: string) {
    if (!/react-native-reanimated\/lib\/module\/ReanimatedModule\/js-reanimated\/webUtils(\.web)?\.js$/.test(id)) return null;
    return `import _dom from 'react-native-web/dist/exports/StyleSheet/compiler/createReactDOMStyle';
import { createTransformValue as _t, createTextShadowValue as _s } from 'react-native-web/dist/exports/StyleSheet/preprocess';
export const createReactDOMStyle = _dom; export const createTransformValue = _t; export const createTextShadowValue = _s;`;
  },
};

const config: StorybookConfig = {
  // SB_STORIES=comma,separated,globs (relative to this folder) builds only those files.
  // Writers use it so another agent's half-written file cannot break their build.
  stories: process.env.SB_STORIES
    ? process.env.SB_STORIES.split(',')
    : ['../../stories/**/*.mdx', '../../stories/**/*.stories.@(ts|tsx)'],
  staticDirs: ['../public'],
  addons: [{ name: '@storybook/addon-docs', options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } } }],
  framework: {
    name: '@storybook/react-native-web-vite',
    options: {
      pluginReactOptions: { exclude: [/\.vite-cache/, /node_modules/], babel: { plugins: ['react-native-reanimated/plugin'] } },
      modulesToTranspile: [
        '@gorhom/bottom-sheet', '@gorhom/portal', 'react-native-reanimated', 'react-native-worklets',
        'react-native-gesture-handler', 'expo-image', 'expo-linear-gradient', 'expo-haptics', 'expo-font',
        'expo-modules-core', 'expo-asset', 'expo-constants', 'expo-sensors', 'expo-crypto', 'expo-image-picker',
        '@expo-google-fonts/outfit', '@react-native-masked-view/masked-view', 'react-native-safe-area-context',
        'react-native-screens', '@react-navigation/native', '@react-navigation/native-stack',
        '@react-navigation/bottom-tabs', '@react-navigation/elements', '@react-native-community/netinfo',
      ],
    },
  },
  async viteFinal(cfg) {
    // Keep Vite's default cache in node_modules/.vite: the framework's commonjs plugin skips that path.
    // A cache outside node_modules gets rewritten twice and breaks dev mode ("Duplicate export of 'default'").
    cfg.plugins = [reanimatedWebUtils, svgAsRnComponent, requireAssetsToImports, ...(cfg.plugins ?? [])];
    cfg.resolve = cfg.resolve ?? {};
    const alias = [
      { find: /^react$/, replacement: nm('react') },
      { find: /^react\/(.*)$/, replacement: nm('react') + '/$1' },
      { find: /^react-dom$/, replacement: nm('react-dom') },
      { find: /^react-dom\/(.*)$/, replacement: nm('react-dom') + '/$1' },
      // Story files live outside this folder, so point Storybook packages at this folder's node_modules.
      { find: /^@storybook\/addon-docs\/blocks$/, replacement: path.resolve(here, '../node_modules/@storybook/addon-docs/dist/blocks.js') },
      { find: /^@mdx-js\/react$/, replacement: path.resolve(here, '../node_modules/@mdx-js/react/index.js') },
      { find: /^expo-asset$/, replacement: nm('expo/node_modules/expo-asset') },
      { find: /^@react-native-firebase\/.*$/, replacement: mock('firebase.ts') },
      { find: /^rive-react-native$/, replacement: mock('rive.tsx') },
      { find: /^lottie-react-native$/, replacement: mock('lottie.tsx') },
      { find: /^@lottiefiles\/dotlottie-react$/, replacement: mock('lottie.tsx') },
      { find: /^react-native-confetti-cannon$/, replacement: mock('confetti.tsx') },
      { find: /^expo-secure-store$/, replacement: mock('secureStore.ts') },
      { find: /^expo-sensors$/, replacement: mock('sensors.ts') },
      { find: /^expo-updates$/, replacement: mock('updates.ts') },
    ];
    const prev = cfg.resolve.alias;
    cfg.resolve.alias = Array.isArray(prev) ? [...alias, ...prev]
      : [...alias, ...Object.entries(prev ?? {}).map(([find, replacement]) => ({ find, replacement: replacement as string }))];
    cfg.resolve.dedupe = ['react', 'react-dom', 'react-native-web'];
    cfg.define = { ...(cfg.define ?? {}), __DEV__: 'true', 'process.env.EXPO_OS': '"web"',
      // Point the app at a host that cannot resolve. apiMock answers every call.
      'process.env.EXPO_PUBLIC_API_BASE_URL': '"https://storybook.invalid"', 'process.env.EXPO_PUBLIC_STAGE': '"staging"' };
    cfg.assetsInclude = ['**/*.riv', '**/*.lottie', '**/*.ttf'];
    return cfg;
  },
};
export default config;
