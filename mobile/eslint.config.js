// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const brandBoundaryConfig = {
  files: ['src/core/**/*'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/brands/*', '@/brands/*', '**/brands', '@/brands'],
            message: 'core/ não pode conhecer marca. Use useTheme() ou useFlag().',
          },
        ],
      },
    ],
  },
};

module.exports = defineConfig([
  expoConfig,
  brandBoundaryConfig,
  {
    ignores: ['dist/*'],
  },
]);
