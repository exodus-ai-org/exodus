import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import path, { resolve } from 'path'
// import { visualizer } from 'rollup-plugin-visualizer'

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
          )
        }
      }
    }
  }
})
