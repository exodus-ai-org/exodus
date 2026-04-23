import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
  unlinkSync,
  writeFileSync
} from 'fs'
import { join } from 'path'

import { and, eq, sql } from 'drizzle-orm'

import { db } from '../db/db'
import { message } from '../db/schema'
import { logger } from '../logger'
import { getArtifactsDir } from '../paths'
import type { ArtifactMeta } from './artifacts'

/**
 * One-time migration: move artifacts from the legacy `shared/` folder into
 * the correct `<chatId>/` folder under `~/.exodus/artifacts/`.
 *
 * Legacy artifacts were saved before commit c15f4d0, when `saveArtifact`
 * hardcoded the chat id as the literal string "shared". For each file
 * there, we look up the owning chatId via the `message.details.artifactId`
 * JSONB field. If no owning message is found (chat deleted, etc.), the
 * orphaned files are deleted. The empty `shared/` folder is removed after.
 *
 * Idempotent — a no-op after the first successful run.
 */
export async function migrateSharedArtifacts(): Promise<void> {
  const sharedDir = join(getArtifactsDir(), 'shared')
  if (!existsSync(sharedDir)) return

  const entries = readdirSync(sharedDir)
  const artifactIds = new Set<string>()
  for (const entry of entries) {
    const match = /^([0-9a-f-]{36})\.(tsx|json)$/i.exec(entry)
    if (match) artifactIds.add(match[1])
  }

  if (artifactIds.size === 0) {
    safeRemoveEmptyDir(sharedDir)
    return
  }

  let moved = 0
  let orphaned = 0

  for (const artifactId of artifactIds) {
    const tsxPath = join(sharedDir, `${artifactId}.tsx`)
    const jsonPath = join(sharedDir, `${artifactId}.json`)

    const rows = await db
      .select({ chatId: message.chatId })
      .from(message)
      .where(
        and(
          eq(message.toolName, 'createArtifact'),
          sql`${message.details}->>'artifactId' = ${artifactId}`
        )
      )
      .limit(1)

    const owningChatId = rows[0]?.chatId
    if (!owningChatId) {
      safeUnlink(tsxPath)
      safeUnlink(jsonPath)
      orphaned++
      continue
    }

    const targetDir = join(getArtifactsDir(), owningChatId)
    if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true })

    const newTsxPath = join(targetDir, `${artifactId}.tsx`)
    const newJsonPath = join(targetDir, `${artifactId}.json`)

    if (existsSync(tsxPath) && !existsSync(newTsxPath)) {
      renameSync(tsxPath, newTsxPath)
    } else {
      safeUnlink(tsxPath)
    }

    if (existsSync(jsonPath)) {
      if (existsSync(newJsonPath)) {
        safeUnlink(jsonPath)
      } else {
        try {
          const raw = readFileSync(jsonPath, 'utf-8')
          const meta = JSON.parse(raw) as ArtifactMeta
          meta.chatId = owningChatId
          writeFileSync(newJsonPath, JSON.stringify(meta, null, 2), 'utf-8')
          safeUnlink(jsonPath)
        } catch {
          renameSync(jsonPath, newJsonPath)
        }
      }
    }

    moved++
  }

  safeRemoveEmptyDir(sharedDir)

  logger.info('app', 'Migrated legacy artifacts', { moved, orphaned })
}

function safeUnlink(path: string): void {
  if (existsSync(path)) {
    try {
      unlinkSync(path)
    } catch {
      /* swallow */
    }
  }
}

function safeRemoveEmptyDir(dir: string): void {
  if (!existsSync(dir)) return
  try {
    const remaining = readdirSync(dir)
    if (remaining.length === 0) rmdirSync(dir)
  } catch {
    /* swallow */
  }
}
