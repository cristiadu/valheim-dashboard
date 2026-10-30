import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/** Lint rules for the log parser: the recommended sets plus the project's own code rules. */
export default tseslint.config(js.configs.recommended, tseslint.configs.recommended, {
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
});
