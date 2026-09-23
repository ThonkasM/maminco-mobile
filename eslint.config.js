// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
  {
    rules: {
      // This experimental rule flags the standard "fetch data on mount" pattern
      // (any effect that calls a function which eventually calls setState).
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
