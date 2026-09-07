import path, { resolve } from 'path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'

import { stripDataTestId } from './src/shared/utils/strip-test-id'
// import { visualizer } from 'rollup-plugin-visualizer'

const stripTestIds = process.env.STRIP_TEST_IDS === '1'

/**
 * Minimal Vite plugin that strips `data-testid` JSX props from OUR source
 * files only. Active when STRIP_TEST_IDS=1 (release builds). Dev and E2E
 * builds keep all markers intact.
 *
 * Note: @vitejs/plugin-react v6 uses OXC (not Babel), so babel.plugins is
 * ignored — this source-level transform hook is necessary.
 * No renderChunk hook: third-party libs carrying their own data-testid are
 * out of scope and left untouched. The strip itself lives in
 * `stripDataTestId` (unit-tested — a dynamic `data-testid={`…${x}…`}` broke
 * the old inline regex and only surfaced in a release build).
 */
function stripTestIdPlugin(): Plugin {
  return {
    name: 'strip-data-testid',
    enforce: 'pre',
    transform(code, id) {
      if (!/\.[tj]sx$/.test(id) || /node_modules/.test(id)) return
      const stripped = stripDataTestId(code)
      if (stripped === code) return
      return { code: stripped, map: null }
    }
  }
}

export default defineConfig({
  main: {
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    },
    build: {
      externalizeDeps: {
        exclude: ['@mariozechner/pi-ai', '@mariozechner/pi-agent-core']
      }
    }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [
      ...(stripTestIds ? [stripTestIdPlugin()] : []),
      react({})
      // visualizer({
      //   gzipSize: true,
      //   brotliSize: true,
      //   emitFile: false,
      //   filename: 'visualizer.html',
      //   open: true
      // })
    ],
    build: {
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: {
        treeshake: true,
        output: {},
        input: {
          main: path.resolve(__dirname, 'src', 'renderer', 'index.html'),
          searchbar: path.resolve(
            __dirname,
            'src',
            'renderer',
            'sub-apps',
            'searchbar',
            'index.html'
          ),
          quickChat: path.resolve(
            __dirname,
            'src',
            'renderer',
            'sub-apps',
            'quick-chat',
            'index.html'
          ),
          artifacts: path.resolve(
            __dirname,
            'src',
            'renderer',
            'sub-apps',
            'artifacts',
            'index.html'
          )
        }
      }
    }
  }
})
