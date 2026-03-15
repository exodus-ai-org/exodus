import { tool } from 'ai'
import { readdir, stat } from 'fs/promises'
import { homedir } from 'os'
import { join, relative } from 'path'
import { z } from 'zod'

function matchGlob(name: string, pattern: string): boolean {
  // Simple glob: * matches anything, ? matches single char
  const regex = new RegExp(
    '^' +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.') +
      '$',
    'i'
  )
  return regex.test(name)
}

export const findFiles = tool({
  description:
    'Find files matching a name pattern within a directory. Searches recursively up to 5 levels deep.',
  inputSchema: z.object({
    pattern: z
      .string()
      .describe(
        'Filename glob pattern to match (e.g. "*.ts", "config.*", "README*").'
      ),
    searchPath: z
      .string()
      .optional()
      .describe(
        'Root directory to search from. Defaults to user home directory.'
      ),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(50)
      .describe('Maximum number of results to return.')
  }),
  execute: async ({ pattern, searchPath, maxResults }) => {
    const root = searchPath ?? homedir()
    const results: string[] = []

    async function walk(dir: string, depth: number): Promise<void> {
      if (results.length >= (maxResults ?? 50) || depth > 5) return
      let entries: string[]
      try {
        entries = await readdir(dir)
      } catch {
        return
      }
      for (const name of entries) {
        if (results.length >= (maxResults ?? 50)) break
        if (name.startsWith('.') && depth > 1) continue
        const fullPath = join(dir, name)
        let isDir = false
        try {
          isDir = (await stat(fullPath)).isDirectory()
        } catch {
          continue
        }
        if (isDir) {
          if (['node_modules', '.git', 'dist', 'out', '.cache'].includes(name))
            continue
          await walk(fullPath, depth + 1)
        } else {
          if (matchGlob(name, pattern)) {
            const info = await stat(fullPath).catch(() => null)
            results.push(
              relative(root, fullPath) + (info ? ` (${info.size}b)` : '')
            )
          }
        }
      }
    }

    await walk(root, 1)
    return { pattern, searchPath: root, results, total: results.length }
  }
})
