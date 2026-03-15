import { tool } from 'ai'
import { stat as fsStat, readdir } from 'fs/promises'
import { join } from 'path'
import { z } from 'zod'

export const listDirectory = tool({
  description: 'List files and directories at a given path.',
  inputSchema: z.object({
    path: z.string().describe('Directory path to list.'),
    recursive: z
      .boolean()
      .optional()
      .default(false)
      .describe('If true, list recursively up to 3 levels deep.')
  }),
  execute: async ({ path, recursive }) => {
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
      return { path, entries }
    } catch (err: unknown) {
      const e = err as { message?: string }
      throw new Error(`Failed to list directory "${path}": ${e.message}`)
    }
  }
})
