import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname } from 'path'

import { eq } from 'drizzle-orm'

import { db } from '../db/db'
import { invalidateSettingsCache } from '../db/queries'
import { mcpServer, settings } from '../db/schema'
import { stripApiKeysFromQueuedJobs } from '../jobs/queries'
import { logger } from '../logger'
import { getLogsDir, getSecretsPurgeMarkerPath } from '../paths'
import { encryptMcpSecrets, encryptSettingsSecretsInPlace } from './at-rest'
import {
  encryptionState,
  SecretEncryptionError,
  warnUnavailableOnce
} from './crypto'
import { secretSafeWriteError } from './index'
import { knownSecretValues } from './known'
import { purgeResidualPlaintext } from './purge'
import { SETTINGS_SECRET_PATHS } from './registry'
import { scrubLogFiles } from './scrub'

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
  /** Raw log files the purge rewrote with secrets masked. */
  logsScrubbed: number
  encryptFailed: boolean
  stripFailed: boolean
}

/** A step's failure, logged without a value (drizzle quotes parameters). */
function logStep(what: string, error: unknown): void {
  logger.error(
    'secrets',
    error instanceof SecretEncryptionError
      ? `${what}: ${error.message}`
      : secretSafeWriteError(what, error).message
  )
}

export async function secretsAtRestStartup(): Promise<SecretsStartupResult> {
  // Each step on its own (re-review S2 N2): a denied Keychain prompt must not
  // keep the job keys from being stripped, nor the strip the purge.
  let counts = { settings: 0, mcp: 0 }
  let encryptFailed = false
  try {
    counts = await encryptSecretsAtRest()
  } catch (error) {
    encryptFailed = true
    logStep('Encrypting stored secrets failed', error)
  }
  let jobs = 0
  let stripFailed = false
  try {
    jobs = await stripApiKeysFromQueuedJobs()
  } catch (error) {
    stripFailed = true
    logStep('Stripping keys from queued jobs failed', error)
  }

  const result = { ...counts, jobs, encryptFailed, stripFailed }
  const marker = getSecretsPurgeMarkerPath()
  const changed = counts.settings + counts.mcp + jobs > 0
  if (!changed && existsSync(marker)) {
    return { ...result, purged: false, logsScrubbed: 0 }
  }

  // The purge runs even when encryption failed: the stripped job payloads and
  // their dead tuples are worth vacuuming, and it costs the plaintext rows
  // nothing. The marker waits for a pass where every step succeeded — the
  // launch that finally encrypts the rows changes them and purges again.
  try {
    await purgeResidualPlaintext()
  } catch (error) {
    logStep('Purging plaintext residue failed', error)
    return { ...result, purged: false, logsScrubbed: 0 }
  }
  let logsScrubbed = 0
  try {
    logsScrubbed = scrubLogFiles(getLogsDir(), await knownSecretValues())
  } catch (error) {
    logStep('Scrubbing the log files failed', error)
  }
  if (!encryptFailed && !stripFailed) {
    mkdirSync(dirname(marker), { recursive: true })
    writeFileSync(
      marker,
      JSON.stringify({ purgedAt: new Date().toISOString() }, null, 2)
    )
  }
  logger.info('secrets', 'Purged plaintext residue from the database files', {
    logsScrubbed
  })
  return { ...result, purged: true, logsScrubbed }
}
