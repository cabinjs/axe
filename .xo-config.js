module.exports = {
  prettier: true,
  space: true,
  extends: ['xo-lass'],
  env: ['node', 'browser'],
  ignore: ['config.js'],
  rules: {
    'n/prefer-global/process': 'off',
    'prefer-object-spread': 'off',
    'unicorn/prefer-includes': 'off',
    'logical-assignment-operators': 'off'
  },
  overrides: [
    {
      files: ['**/*.d.ts'],
      rules: {
        'no-unused-vars': 'off',
        '@typescript-eslint/naming-convention': 'off',
        'no-redeclare': 'off',
        '@typescript-eslint/no-redeclare': 'off'
      }
    },
    {
      files: ['**/*.test-d.ts'],
      rules: {
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-confusing-void-expression': 'off', // Conflicts with `expectError` assertion.
        '@typescript-eslint/no-unsafe-assignment': 'off'
      }
    }
  ]
};
