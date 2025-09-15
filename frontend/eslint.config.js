import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config([
  { ignores: ['dist', 'dev-dist', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // 放宽未使用变量的检查，允许以_开头的变量
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true 
      }],
      // 在开发阶段允许any类型，但给出警告
      '@typescript-eslint/no-explicit-any': 'warn',
      // 允许console语句（开发时有用）
      'no-console': 'warn',
      // 放宽prefer-const规则
      'prefer-const': 'warn',
      // React相关规则调整
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': 'warn',
      // 放宽Switch case相关规则
      'no-case-declarations': 'warn',
      // 放宽意外的多行规则
      'no-unexpected-multiline': 'warn',
      // 放宽转义字符规则
      'no-useless-escape': 'warn',
      // 放宽原型方法规则
      'no-prototype-builtins': 'warn',
      // 放宽命名空间规则
      '@typescript-eslint/no-namespace': 'warn',
    },
  },
])
