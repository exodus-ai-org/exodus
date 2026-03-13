import { tool } from 'ai'
import { readFile, readdir, stat } from 'fs/promises'
import path from 'path'
import { z } from 'zod'

const MAX_RESULTS = 100
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'out',
  '__pycache__'
])

async function grepDir(
  dir: string,
  regex: RegExp,
  fileGlob: string | undefined,
  contextLines: number,
  results: GrepResult[],
  depth: number
): Promise<void> {
  if (depth > 8 || results.length >= MAX_RESULTS) return

  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return
  }

  for (const entry of entries) {
    if (results.length >= MAX_RESULTS) break
    const fullPath = path.join(dir, entry)

    let entryStat
    try {
      entryStat = await stat(fullPath)
    } catch {
      continue
    }

    if (entryStat.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) {
        await grepDir(
          fullPath,
          regex,
          fileGlob,
          contextLines,
          results,
          depth + 1
        )
      }
    } else if (entryStat.isFile()) {
      if (fileGlob && !matchGlob(entry, fileGlob)) continue
      await grepFile(fullPath, regex, contextLines, results)
    }
  }
}

function matchGlob(filename: string, glob: string): boolean {
  // Simple glob: *.ts, *.{ts,tsx}, etc.
  if (glob.startsWith('*.')) {
    const exts = glob.slice(2)
    if (exts.startsWith('{') && exts.endsWith('}')) {
      const extList = exts.slice(1, -1).split(',')
      return extList.some((ext) => filename.endsWith('.' + ext.trim()))
    }
    return filename.endsWith('.' + exts)
  }
  return filename.includes(glob.replace('*', ''))
}

interface GrepMatch {
  lineNumber: number
  line: string
  context: { before: string[]; after: string[] }
}

interface GrepResult {
  file: string
  matches: GrepMatch[]
}

async function grepFile(
  filePath: string,
  regex: RegExp,
  contextLines: number,
  results: GrepResult[]
): Promise<void> {
  let content: string
  try {
    content = await readFile(filePath, 'utf-8')
  } catch {
    return // binary or unreadable file
  }

  const lines = content.split('\n')
  const matches: GrepMatch[] = []

  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      regex.lastIndex = 0 // reset for global flag
      const before = lines.slice(Math.max(0, i - contextLines), i)
      const after = lines.slice(
        i + 1,
        Math.min(lines.length, i + 1 + contextLines)
      )
      matches.push({
        lineNumber: i + 1,
        line: lines[i],
        context: { before, after }
      })
    }
    regex.lastIndex = 0
  }

  if (matches.length > 0) {
    results.push({ file: filePath, matches })
  }
}

export const grep = tool({
  description:
    'Search for a regex pattern in files. Returns matching lines with optional context. ' +
    'Use this to find where a function is defined, where a variable is used, or locate specific code. ' +
    'Faster than reading entire files when searching for specific content.',
  inputSchema: z.object({
    pattern: z.string().describe('Regular expression pattern to search for.'),
    path: z
      .string()
      .describe('File or directory path to search in. Use absolute path.'),
    file_glob: z
      .string()
      .optional()
      .describe(
        'Filter by filename pattern, e.g. "*.ts", "*.{ts,tsx}", "*.py". Only applies when searching a directory.'
      ),
    context_lines: z
      .number()
      .optional()
      .default(2)
      .describe(
        'Number of lines to show before and after each match. Default: 2.'
      ),
    case_insensitive: z
      .boolean()
      .optional()
      .default(false)
      .describe('Case-insensitive search. Default: false.')
  }),
  execute: async ({
    pattern,
    path: searchPath,
    file_glob,
    context_lines,
    case_insensitive
  }) => {
    let regex: RegExp
    try {
      regex = new RegExp(pattern, case_insensitive ? 'ig' : 'g')
    } catch (e) {
      throw new Error(
        `Invalid regex pattern: ${e instanceof Error ? e.message : String(e)}`
      )
    }

    const results: GrepResult[] = []

    let pathStat
    try {
      pathStat = await stat(searchPath)
    } catch {
      throw new Error(`Path not found: ${searchPath}`)
    }

    if (pathStat.isFile()) {
      await grepFile(searchPath, regex, context_lines ?? 2, results)
    } else if (pathStat.isDirectory()) {
      await grepDir(
        searchPath,
        regex,
        file_glob,
        context_lines ?? 2,
        results,
        0
      )
    }

    const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0)

    return {
      pattern,
      path: searchPath,
      totalFiles: results.length,
      totalMatches,
      truncated: totalMatches >= MAX_RESULTS,
      results
    }
  }
})
