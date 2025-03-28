import { readMigrationFiles } from 'drizzle-orm/migrator'
import { join } from 'path'
const fs = require('fs').promises

async function compileMigrations() {
  try {
    const migrations = readMigrationFiles({
      migrationsFolder: './renderer/lib/db/migrations/'
    })

    await fs.writeFile(
      join(__dirname, './migrations.json'),
      JSON.stringify(migrations)
    )

    console.log('Migrations compiled!')
  } catch (error) {
    console.error('Error compiling migrations:', error)
  }
}

compileMigrations()
