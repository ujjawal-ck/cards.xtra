module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated's plugin MUST be the last plugin in the list.
    plugins: ['react-native-reanimated/plugin'],
  };
};
