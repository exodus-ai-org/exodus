import { stat as fsStat, readdir } from 'fs/promises'
import { join } from 'path'

import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'

const listDirectorySchema = Type.Object({
  path: Type.String({ description: 'Directory path to list.' }),
  recursive: Type.Optional(
    Type.Boolean({
      description: 'If true, list recursively up to 3 levels deep.'
    })
  )
})

export const listDirectory: AgentTool<typeof listDirectorySchema> = {
  name: 'listDirectory',
  label: 'List Directory',
  description: 'List files and directories at a given path.',
  parameters: listDirectorySchema,
  execute: async (_toolCallId, { path, recursive }) => {
    async function listDir(
      dir: string,
      depth: number
    ): Promise<
      {
        name: string
        type: 'file' | 'directory'
        size?: number
        children?: unknown[]
      }[]
    > {
      const names = await readdir(dir)
      const result = await Promise.all(
        names.map(async (name) => {
          const fullPath = join(dir, name)
          const info = await fsStat(fullPath).catch(() => null)
          if (info?.isDirectory()) {
            const children =
              recursive && depth < 3
                ? await listDir(fullPath, depth + 1)
                : undefined
            return { name, type: 'directory' as const, children }
          } else {
            return { name, type: 'file' as const, size: info?.size }
          }
        })
      )
      return result
    }

    try {
      const entries = await listDir(path, 1)
      const details = { path, entries }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(details) }],
        details
      }
    } catch (err: unknown) {
      const e = err as { message?: string }
      throw new Error(`Failed to list directory "${path}": ${e.message}`)
    }
  }
}
