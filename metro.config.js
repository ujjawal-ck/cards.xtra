/**
 * Metro config — adds SVG-as-component support via react-native-svg-transformer.
 *
 * After editing this file, restart Expo with `npx expo start -c` so Metro
 * rebuilds its transform cache; otherwise old emoji/no-SVG bundles are reused.
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
};

config.resolver = {
  ...config.resolver,
  // Drop svg from assets (handled as a source component via the transformer
  // above) and add 'riv' so Rive animation files can be `require()`d and
  // bundled as binary assets (used by FilterTransitionOverlay).
  assetExts: [
    ...config.resolver.assetExts.filter((ext) => ext !== 'svg'),
    'riv',
  ],
  sourceExts: [...config.resolver.sourceExts, 'svg'],
  // Expo SDK 54 turns Metro's strict package-exports resolver ON by default.
  // @react-native-firebase ships an `exports` map that omits internal files
  // (e.g. dist/module/FirebaseApp.js), so strict mode reports those existing
  // files as "unable to resolve" and the bundle fails. Turning it off reverts
  // to the classic main/react-native-field resolution (the SDK ≤52 default),
  // which resolves Firebase's internals fine and is compatible with the rest
  // of the dependency tree. Required for the GA4/Firebase sink to bundle.
  unstable_enablePackageExports: false,
};

module.exports = config;
