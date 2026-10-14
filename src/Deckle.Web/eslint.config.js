import tseslint from 'typescript-eslint';

// Mirrors SonarCloud rules locally so issues are caught before they reach a PR.
// Add rules here as recurring Sonar findings come up.
export default tseslint.config(
  { ignores: ['.svelte-kit/', 'build/', 'node_modules/'] },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname }
    },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      // Sonar S2933: members only assigned in the constructor should be readonly
      '@typescript-eslint/prefer-readonly': 'error',
      // Sonar S7503: async functions should contain an await
      '@typescript-eslint/require-await': 'error',
      // Sonar S6594: use RegExp.exec() instead of String.match()
      '@typescript-eslint/prefer-regexp-exec': 'error',
      // Sonar S6551: objects should not be stringified as [object Object]
      '@typescript-eslint/no-base-to-string': 'error'
    }
  }
);
