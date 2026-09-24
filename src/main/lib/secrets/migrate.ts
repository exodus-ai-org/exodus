import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname } from 'path'

import { eq } from 'drizzle-orm'

import { db } from '../db/db'
import { invalidateSettingsCache } from '../db/queries'
import { mcpServer, settings } from '../db/schema'
import { stripApiKeysFromQueuedJobs } from '../jobs/queries'
import { logger } from '../logger'
import { getSecretsPurgeMarkerPath } from '../paths'
import { encryptMcpSecrets, encryptSettingsSecretsInPlace } from './at-rest'
import { encryptionState, warnUnavailableOnce } from './crypto'
import { purgeResidualPlaintext } from './purge'
import { SETTINGS_SECRET_PATHS } from './registry'

/** The `settings` columns that hold a registry secret. */
const SECRET_COLUMNS = [
  ...new Set(SETTINGS_SECRET_PATHS.map((p) => p.split('.')[0]))
] as Array<keyof typeof settings.$inferInsert>

/**
 * The startup migration (spec 2026-09-25 §2.3): every plaintext registry value
 * in `settings` and every plaintext MCP secret is encrypted in place. Runs
 * after the schema migrations and before the server starts. Idempotent — a
 * value already `enc:v1:` is left alone, so a second run changes nothing.
 * With no safeStorage backend it changes nothing either (and warns once).
 * Logs how many values it encrypted, never a value.
 */
export async function encryptSecretsAtRest(): Promise<{
  settings: number
  mcp: number
}> {
  if (encryptionState() !== 'on') {
    warnUnavailableOnce()
    return { settings: 0, mcp: 0 }
  }

  const counts = await db.transaction(async (tx) => {
    await tx.insert(settings).values({ id: 'global' }).onConflictDoNothing()
    const [row] = await tx.select().from(settings)
    const sealed = structuredClone(row!)
    const inSettings = encryptSettingsSecretsInPlace(sealed)
    if (inSettings) {
      await tx
        .update(settings)
        .set(Object.fromEntries(SECRET_COLUMNS.map((c) => [c, sealed[c]])))
        .where(eq(settings.id, row!.id))
    }

    let inMcp = 0
    for (const server of await tx.select().from(mcpServer)) {
      const { sealed: cols, changed } = encryptMcpSecrets({
        env: server.env,
        headers: server.headers,
        extraConfig: server.extraConfig,
        url: server.url,
        args: server.args
      })
      if (!changed) continue
      inMcp += changed
      await tx.update(mcpServer).set(cols).where(eq(mcpServer.id, server.id))
    }
    return { settings: inSettings, mcp: inMcp }
  })

  invalidateSettingsCache()
  if (counts.settings || counts.mcp) {
    logger.info('secrets', 'Encrypted stored secrets', counts)
  }
  return counts
}

export interface SecretsStartupResult {
  settings: number
  mcp: number
  /** Queued job payloads an `apiKey` was stripped from. */
  jobs: number
  /** Whether the on-disk residue was purged this launch. */
  purged: boolean
}

/**
 * Everything `main.ts` runs for secrets at rest, after the schema migrations
 * and before any route or job: encrypt what is still plaintext, strip keys
 * from queued job payloads (ruling R3), and then — when either changed
 * something, or no purge has ever run on this data directory — purge the
 * plaintext the old values left on disk (review S2 C2, `purge.ts`). A marker
 * file records the purge, so a normal launch does not repeat it; its
 * `purgedAt` is the moment backups older than it may still hold plaintext
 * (`removeBackupsOlderThan` in `backup.ts`).
 */
export async function secretsAtRestStartup(): Promise<SecretsStartupResult> {
  const counts = await encryptSecretsAtRest()
  const jobs = await stripApiKeysFromQueuedJobs()
  const marker = getSecretsPurgeMarkerPath()
  const changed = counts.settings + counts.mcp + jobs > 0
  if (!changed && existsSync(marker)) return { ...counts, jobs, purged: false }

  await purgeResidualPlaintext()
  mkdirSync(dirname(marker), { recursive: true })
  writeFileSync(
    marker,
    JSON.stringify({ purgedAt: new Date().toISOString() }, null, 2)
  )
  logger.info('secrets', 'Purged plaintext residue from the database files')
  return { ...counts, jobs, purged: true }
}
