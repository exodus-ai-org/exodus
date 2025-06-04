import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import path, { resolve } from 'path'
// import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [
      react()
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
          main: path.resolve(__dirname, 'index.html'),
          searchbar: path.resolve(__dirname, 'searchbar', 'index.html')
        }
      }
    }
  }
})
