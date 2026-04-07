module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@api': './src/api',
            '@store': './src/store',
            '@services': './src/services',
            '@screens': './src/screens',
            '@components': './src/components',
            '@hooks': './src/hooks',
            '@utils': './src/utils',
            '@navigation': './src/navigation',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
