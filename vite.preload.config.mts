import { defineConfig } from 'vite'

// https://vitejs.dev/config
export default defineConfig({
  build: {
    // Hidden source maps, without the sources' text — see the note in
    // vite.main.config.mts.
    sourcemap: 'hidden',
    rollupOptions: {
      output: { sourcemapExcludeSources: true }
    }
  }
})
