// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    files: ['src/__tests__/**'],
    languageOptions: { globals: { jest: 'readonly' } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]);
