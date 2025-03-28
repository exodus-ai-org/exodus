import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { drizzle } from 'drizzle-orm/pglite'

const client = new PGlite({ dataDir: 'idb://exodus', extensions: { vector } })
const db = drizzle(client)

export { db }
