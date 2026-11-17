import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'dist/', 'index.html'] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-shadow': 'warn',
      complexity: ['warn', 16],
    },
  },
  { files: ['src/**/*.js'], languageOptions: { globals: { ...globals.browser } } },
  { files: ['scripts/**', 'tests/**'], languageOptions: { globals: { ...globals.node } } },
];
