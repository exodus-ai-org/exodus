import { tool } from 'ai'
import { writeFile as fsWriteFile, mkdir } from 'fs/promises'
import { dirname } from 'path'
import { z } from 'zod'

export const writeFile = tool({
  description:
    'Write content to a file at the given path. Creates parent directories if they do not exist. Overwrites existing files.',
  inputSchema: z.object({
    path: z
      .string()
      .describe('Absolute or relative path to write the file to.'),
    content: z.string().describe('Content to write into the file.'),
    append: z
      .boolean()
      .optional()
      .default(false)
      .describe('If true, append to the file instead of overwriting.')
  }),
  execute: async ({ path, content, append }) => {
    try {
      await mkdir(dirname(path), { recursive: true })
      if (append) {
        const { appendFile } = await import('fs/promises')
        await appendFile(path, content, 'utf-8')
      } else {
        await fsWriteFile(path, content, 'utf-8')
      }
      return { path, bytes: Buffer.byteLength(content), appended: append }
    } catch (err: unknown) {
      const e = err as { message?: string }
      throw new Error(`Failed to write file "${path}": ${e.message}`)
    }
  }
})
