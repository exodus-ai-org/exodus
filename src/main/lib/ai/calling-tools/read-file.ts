import { tool } from 'ai'
import { readFile as fsReadFile } from 'fs/promises'
import { z } from 'zod'

export const readFile = tool({
  description: 'Read the contents of a file at the given path.',
  inputSchema: z.object({
    path: z.string().describe('Absolute or relative path to the file to read.'),
    encoding: z
      .enum(['utf-8', 'base64'])
      .optional()
      .default('utf-8')
      .describe('File encoding. Use base64 for binary files.')
  }),
  execute: async ({ path, encoding }) => {
    try {
      const content = await fsReadFile(path, encoding as BufferEncoding)
      return {
        path,
        content: content.toString(),
        size: Buffer.byteLength(content)
      }
    } catch (err: unknown) {
      const e = err as { message?: string }
      throw new Error(`Failed to read file "${path}": ${e.message}`)
    }
  }
})
