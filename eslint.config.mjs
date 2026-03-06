import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import tseslint from '@electron-toolkit/eslint-config-ts'
import eslintPluginReact from 'eslint-plugin-react'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'
import eslintPluginReactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules',
      '**/dist',
      '**/out',
      '.vite/',
      'src/renderer/components/ui/'
    ]
  },
  tseslint.configs.recommended,
  { rules: { '@typescript-eslint/explicit-function-return-type': 'off' } },
  {
    files: ['src/renderer/**/*.{ts,tsx}', 'src/preload/**/*.{ts,tsx}'],
    ...eslintPluginReact.configs.flat.recommended,
    ...eslintPluginReact.configs.flat['jsx-runtime'],
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}', 'src/preload/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': eslintPluginReactHooks,
      'react-refresh': eslintPluginReactRefresh
    },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginReactRefresh.configs.vite.rules,
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off'
    }
  },
  eslintConfigPrettier
)
