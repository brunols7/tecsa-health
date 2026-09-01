// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Fronteira de marca (CLAUDE.md §11.1): nada em src/core/**/* pode importar
// de brands/*. ESLint 9 do template Expo usa flat config em vez de
// .eslintrc.js — a regra abaixo é a tradução direta do override do
// CLAUDE.md para esse formato, com o mesmo efeito mecânico.
const brandBoundaryConfig = {
  files: ['src/core/**/*'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/brands/*', '@/brands/*'],
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
