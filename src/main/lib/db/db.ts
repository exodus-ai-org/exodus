import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { app } from 'electron'
import { join } from 'path'

const dbPath = join(app.getPath('userData'), 'Database')
export const pgLiteClient = new PGlite(dbPath)
export const db = drizzle(pgLiteClient)
