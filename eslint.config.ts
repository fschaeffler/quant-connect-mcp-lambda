import { fixupPluginRules } from '@eslint/compat'
import eslint from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierRecommended,
  eslintConfigPrettier,
  {
    ignores: [
      '**/node_modules/**',
      '**/build/**',
      '**/dist/**',
      '**/coverage/**',
      '**/layer/**',
      '**/cdk.out/**',
      '**/.yarn/**',
      '**/.cdk.staging/**',
      '**/package-lock.json',
      '**/yarn.lock',
      '**/package.json',
      '**/jest.config.js',
      '**/*.d.ts',
      '**/*.cjs',
      '**/lib/**/*.js',
      '**/bin/**/*.js',
    ],
  },
  {
    extends: [eslint.configs.recommended, tseslint.configs.recommended],
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      import: fixupPluginRules(importPlugin),
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-unused-expressions': ['error', { allowTaggedTemplates: true }],

      'max-lines-per-function': ['warn', 160],
      'comma-dangle': ['warn', 'only-multiline'],
      'max-len': ['warn', { code: 160 }],
      'no-console': 'error',
      curly: 'error',

      'import/no-cycle': [
        'warn',
        {
          maxDepth: '∞',
          ignoreExternal: true,
        },
      ],
    },
  },
  {
    files: ['*.ts'],
    rules: {
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'variable',
          format: ['camelCase'],
        },
        {
          selector: 'variable',
          modifiers: ['const'],
          format: ['UPPER_CASE', 'camelCase'],
        },
        {
          selector: 'variable',
          modifiers: ['const', 'global', 'exported'],
          format: ['UPPER_CASE', 'camelCase'],
        },
        {
          selector: 'variable',
          modifiers: ['const', 'global'],
          format: ['camelCase', 'UPPER_CASE'],
        },
        {
          selector: 'function',
          format: ['camelCase'],
        },
      ],
    },
  }
)
