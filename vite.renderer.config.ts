// eslint-disable-next-line import/default
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './renderer')
    }
  },
  optimizeDeps: {
    exclude: ['@electric-sql/pglite']
  }
})
