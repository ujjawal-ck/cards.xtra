// Minimal react-native stand-in for node unit tests of API/mapper modules.
module.exports = {
  Platform: { OS: 'android', Version: 34, select: (o) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 360, height: 800 }) },
  PixelRatio: { get: () => 3 },
};
