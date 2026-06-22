import path, { resolve } from 'path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
// import { visualizer } from 'rollup-plugin-visualizer'

const stripTestIds = process.env.STRIP_TEST_IDS === '1'

/**
 * Vite plugin that strips `data-testid` props from the renderer bundle.
 * Only active when STRIP_TEST_IDS=1 (release builds). Dev and E2E builds keep
 * all markers intact.
 *
 * @vitejs/plugin-react v6 uses OXC (not Babel), so babel.plugins is ignored.
 * Two hooks are used:
 *   1. `transform` — strips JSX source props from our own .tsx/.jsx files early
 *      (before OXC compiles them), avoiding any expression-evaluation issues.
 *   2. `renderChunk` — strips any remaining "data-testid":... patterns from the
 *      final bundled JS, covering pre-compiled third-party libraries (e.g.
 *      @vis.gl/react-google-maps, react-resizable-panels) that ship with
 *      data-testid already compiled to `React.createElement` prop objects.
 */
function stripTestIdPlugin(): Plugin {
  return {
    name: 'strip-data-testid',
    enforce: 'pre',
    transform(code, id) {
      if (!/\.[tj]sx$/.test(id) || /node_modules/.test(id)) return
      // Remove data-testid JSX props in all common forms:
      //   data-testid={expr}
      //   data-testid="string"
      //   data-testid='string'
      const stripped = code
        .replace(/\s+data-testid=\{[^}]*\}/g, '')
        .replace(/\s+data-testid="[^"]*"/g, '')
        .replace(/\s+data-testid='[^']*'/g, '')
      if (stripped === code) return
      return { code: stripped, map: null }
    },
    renderChunk(code) {
      // Strip compiled data-testid prop patterns from bundled output.
      // These come from third-party pre-compiled JS in node_modules
      // (e.g. @vis.gl/react-google-maps) where data-testid is already
      // compiled into React.createElement prop objects.
      //
      // Patterns we must handle and the context they appear in:
      //   Object.assign({ ref: x, "data-testid": "map", style: y })
      //   => strip the key:value pair + surrounding comma/whitespace
      //
      // Strategy: match a standalone key:value pair (with optional trailing
      // comma) AND remove any preceding comma+space so the object stays valid.
      const stripped = code
        // With double-quoted string value:  ,"data-testid":"val"  or  "data-testid":"val",
        .replace(/,\s*"data-testid"\s*:\s*"[^"]*"/g, '')
        .replace(/"data-testid"\s*:\s*"[^"]*"\s*,?/g, '')
        // With single-quoted string value
        .replace(/,\s*"data-testid"\s*:\s*'[^']*'/g, '')
        .replace(/"data-testid"\s*:\s*'[^']*'\s*,?/g, '')
        // With identifier/expression value (no trailing comma needed — stop at , } )
        .replace(/,\s*"data-testid"\s*:\s*[^,}"'\]]+/g, '')
        .replace(/"data-testid"\s*:\s*[^,}"'\]]+,?/g, '')
      if (stripped === code) return null
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
