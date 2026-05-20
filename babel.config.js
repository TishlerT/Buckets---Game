module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated 4 split worklets into its own package. The plugin must be
      // listed LAST and must be `react-native-worklets/plugin`, NOT the old
      // `react-native-reanimated/plugin` (which throws "Exception in
      // HostFunction: <unknown>" at runtime on iOS new architecture).
      'react-native-worklets/plugin',
    ],
  };
};
