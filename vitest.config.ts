import { tmpdir } from 'os'
import { resolve } from 'path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@main': resolve(import.meta.dirname, 'src/main'),
      '@': resolve(import.meta.dirname, 'src/renderer')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    env: {
      // Dev builds use the real ~/.exodus, so a test that imports the real
      // db/db.ts (instead of mocking it) would open — and could write to — the
      // user's actual database. Point every test at a scratch data dir instead.
      EXODUS_HOME: resolve(tmpdir(), 'exodus-unit-tests-home')
    },
    coverage: {
      provider: 'v8',
      include: ['packages/shared/src/**', 'src/main/lib/**'],
      exclude: ['**/index.ts']
    }
  }
})
