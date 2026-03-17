import type { PgTableWithColumns } from 'drizzle-orm/pg-core'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

/**
 * Message table must have at least these columns.
 * Matches the common Drizzle pattern for a chat message table.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MessageTableRef = PgTableWithColumns<any>

export interface LcmConfig {
  /** Drizzle database instance (PGlite, node-postgres, etc.) */
  db: AnyDb
  /** Reference to the host app's `message` table for context bootstrapping & search */
  messageTable: MessageTableRef
}

let _config: LcmConfig | null = null

/**
 * Initialize the LCM package. Call once at app startup before using any LCM functions.
 *
 * ```ts
 * import { initLcm } from 'pi-lcm'
 * import { message } from './your-schema'
 *
 * initLcm({ db: drizzleDb, messageTable: message })
 * ```
 */
export function initLcm(config: LcmConfig): void {
  _config = config
}

export function getDb(): AnyDb {
  if (!_config) throw new Error('[pi-lcm] Call initLcm() before using LCM.')
  return _config.db
}

export function getMessageTable(): MessageTableRef {
  if (!_config) throw new Error('[pi-lcm] Call initLcm() before using LCM.')
  return _config.messageTable
}
