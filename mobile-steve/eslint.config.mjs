// https://docs.expo.dev/guides/using-eslint/
import { defineConfig } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat.js';

export default defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'coverage/*'],
  },
  {
    rules: {
      // French UI copy uses apostrophes everywhere in JSX text; React Native
      // renders text nodes verbatim so there is no HTML-entity concern.
      'react/no-unescaped-entities': 'off',
    },
  },
]);
