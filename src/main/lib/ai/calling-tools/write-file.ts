import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { writeFile as fsWriteFile, mkdir } from 'fs/promises'
import { dirname } from 'path'

const writeFileSchema = Type.Object({
  path: Type.String({
    description: 'Absolute or relative path to write the file to.'
  }),
  content: Type.String({ description: 'Content to write into the file.' }),
  append: Type.Optional(
    Type.Boolean({
      description: 'If true, append to the file instead of overwriting.'
    })
  )
})

export const writeFile: AgentTool<typeof writeFileSchema> = {
  name: 'writeFile',
  label: 'Write File',
  description:
    'Write content to a file at the given path. Creates parent directories if they do not exist. Overwrites existing files.',
  parameters: writeFileSchema,
  execute: async (_toolCallId, { path, content, append }) => {
    try {
      await mkdir(dirname(path), { recursive: true })
      if (append) {
        const { appendFile } = await import('fs/promises')
        await appendFile(path, content, 'utf-8')
      } else {
        await fsWriteFile(path, content, 'utf-8')
      }
      const details = {
        path,
        bytes: Buffer.byteLength(content),
        appended: append ?? false
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(details) }],
        details
      }
    } catch (err: unknown) {
      const e = err as { message?: string }
      throw new Error(`Failed to write file "${path}": ${e.message}`)
    }
  }
}
