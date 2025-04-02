import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/main/lib/db/schema.ts',
  out: './resources/drizzle',
  dialect: 'postgresql',
  driver: 'pglite',
  dbCredentials: { url: 'database.sqlite' }
})
