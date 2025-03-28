import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './renderer/lib/db/migrations',
  schema: './renderer/lib/db/schema.ts',
  driver: 'pglite',
  dialect: 'postgresql'
})
