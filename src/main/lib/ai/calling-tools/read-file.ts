import { readFile as fsReadFile } from 'fs/promises'

import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'

const readFileSchema = Type.Object({
  path: Type.String({
    description: 'Absolute or relative path to the file to read.'
  }),
  encoding: Type.Optional(
    Type.Union([Type.Literal('utf-8'), Type.Literal('base64')], {
      description: 'File encoding. Use base64 for binary files.'
    })
  )
})

export const readFile: AgentTool<typeof readFileSchema> = {
  name: 'readFile',
  label: 'Read File',
  description: 'Read the contents of a file at the given path.',
  parameters: readFileSchema,
  execute: async (_toolCallId, { path, encoding }) => {
    try {
      const enc = (encoding ?? 'utf-8') as BufferEncoding
      const content = await fsReadFile(path, enc)
      const details = {
        path,
        content: content.toString(),
        size: Buffer.byteLength(content)
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(details) }],
        details
      }
    } catch (err: unknown) {
      const e = err as { message?: string }
      throw new Error(`Failed to read file "${path}": ${e.message}`)
    }
  }
}
