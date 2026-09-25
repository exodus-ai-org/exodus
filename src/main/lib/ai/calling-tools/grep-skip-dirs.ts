/** Directories a recursive grep never enters — the approval gate's tree scan (`kernel/approval.ts`) skips the same ones. Import-free, so the gate does not pull in the tool. */
export const GREP_SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'out',
  '__pycache__'
])
