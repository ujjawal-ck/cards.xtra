import type { StorybookConfig } from '@storybook/react-webpack5';
import path from 'path';
import webpack from 'webpack';

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  framework: { name: '@storybook/react-webpack5', options: {} },
  core: { disableTelemetry: true },
  typescript: { reactDocgen: 'react-docgen-typescript' },

  webpackFinal: async (cfg) => {
    cfg.resolve = cfg.resolve || {};
    cfg.resolve.alias = {
      ...(cfg.resolve.alias || {}),
      'react-native$': 'react-native-web',
      'expo-linear-gradient': require.resolve('./shims/LinearGradient.tsx'),
      'expo-status-bar': require.resolve('./shims/StatusBar.tsx'),
      'lottie-react-native': require.resolve('./shims/Lottie.tsx'),
    };
    cfg.resolve.extensions = [
      '.web.tsx', '.web.ts', '.web.jsx', '.web.js',
      '.tsx', '.ts', '.jsx', '.js',
      ...(cfg.resolve.extensions || []),
    ];

    cfg.module = cfg.module || { rules: [] };
    cfg.module.rules = cfg.module.rules || [];

    // SVG → React component
    const fileLoaderRule = cfg.module.rules.find(
      (rule: any) => rule?.test && rule.test.toString().includes('svg')
    );
    if (fileLoaderRule && typeof fileLoaderRule === 'object') {
      (fileLoaderRule as any).exclude = /\.svg$/;
    }
    cfg.module.rules.push({
      test: /\.svg$/,
      use: [{
        loader: '@svgr/webpack',
        options: { native: false, svgoConfig: { plugins: [{ name: 'preset-default' }] } },
      }],
    });

    // Babel transpile for our code + RN/Expo/gorhom/svg/reanimated source
    cfg.module.rules.push({
      test: /\.(ts|tsx|js|jsx)$/,
      include: [
        path.resolve(__dirname, '.'),
        path.resolve(__dirname, '../src'),
        path.resolve(__dirname, '../stories'),
        /node_modules\/react-native-/,
        /node_modules\/@react-native/,
        /node_modules\/@react-navigation/,
        /node_modules\/expo/,
        /node_modules\/@expo/,
        /node_modules\/@gorhom/,
      ],
      use: {
        loader: 'babel-loader',
        options: {
          sourceType: 'unambiguous',
          presets: [
            ['@babel/preset-env', { targets: { browsers: ['last 2 versions'] } }],
            '@babel/preset-typescript',
            ['@babel/preset-react', { runtime: 'automatic' }],
          ],
          plugins: [
            'react-native-web',
            '@babel/plugin-transform-runtime',
            'react-native-reanimated/plugin',
          ],
        },
      },
    });

    // PNG / font assets
    cfg.module.rules.push({
      test: /\.(png|jpe?g|gif|ttf|otf|woff2?)$/,
      type: 'asset/resource',
    });

    // Globals React Native expects but the web bundle doesn't provide
    cfg.plugins = cfg.plugins || [];
    cfg.plugins.push(
      new webpack.DefinePlugin({
        __DEV__: JSON.stringify(true),
        'process.env.JEST_WORKER_ID': JSON.stringify(null),
      }),
      new webpack.ProvidePlugin({
        regeneratorRuntime: ['regenerator-runtime/runtime', 'default'],
      })
    );

    return cfg;
  },
};

export default config;