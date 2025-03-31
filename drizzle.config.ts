import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/main/lib/db/schema.ts',
  out: './src/main/lib/db/migrations',
  dialect: 'postgresql',
  driver: 'pglite',
  dbCredentials: { url: 'database.sqlite' }
})
