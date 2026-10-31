import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Lint rules for the dashboard: the recommended sets for TypeScript and Svelte plus the project's own code rules. */
export default tseslint.config(
  { ignores: ['build/', '.svelte-kit/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  svelte.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    rules: {
      curly: ['error', 'all'],
      'func-style': ['error', 'expression'],
      'no-console': 'error',
      'no-restricted-imports': ['error', { patterns: [{ group: ['./*', '../*'], message: 'Import through the #/ alias.' }] }],
      'no-restricted-syntax': [
        'error',
        { selector: "CallExpression[callee.property.name='then']", message: 'Use async/await instead of .then().' },
      ],
    },
  },
);
