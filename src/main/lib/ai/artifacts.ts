import { existsSync, mkdirSync, readdirSync, readFileSync } from 'fs'
import { writeFile } from 'fs/promises'
import { join } from 'path'

import { getArtifactsDir } from '../paths'

export interface ArtifactMeta {
  id: string
  chatId: string
  title: string
  createdAt: string
}

function getChatArtifactsDir(chatId: string): string {
  const dir = join(getArtifactsDir(), chatId)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export async function saveArtifact(
  chatId: string,
  artifactId: string,
  title: string,
  code: string
): Promise<string> {
  const dir = getChatArtifactsDir(chatId)
  const filePath = join(dir, `${artifactId}.tsx`)
  const metaPath = join(dir, `${artifactId}.json`)

  await writeFile(filePath, code, 'utf-8')
  await writeFile(
    metaPath,
    JSON.stringify(
      { id: artifactId, chatId, title, createdAt: new Date().toISOString() },
      null,
      2
    ),
    'utf-8'
  )

  return filePath
}

export function getArtifact(
  chatId: string,
  artifactId: string
): { code: string; meta: ArtifactMeta } | null {
  const dir = join(getArtifactsDir(), chatId)
  const filePath = join(dir, `${artifactId}.tsx`)
  const metaPath = join(dir, `${artifactId}.json`)

  if (!existsSync(filePath)) return null

  const code = readFileSync(filePath, 'utf-8')
  const meta = existsSync(metaPath)
    ? (JSON.parse(readFileSync(metaPath, 'utf-8')) as ArtifactMeta)
    : { id: artifactId, chatId, title: artifactId, createdAt: '' }

  return { code, meta }
}

export function listArtifacts(chatId: string): ArtifactMeta[] {
  const dir = join(getArtifactsDir(), chatId)
  if (!existsSync(dir)) return []

  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf-8')) as ArtifactMeta)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
