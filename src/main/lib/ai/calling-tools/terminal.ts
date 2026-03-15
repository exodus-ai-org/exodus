import { tool } from 'ai'
import { exec } from 'child_process'
import { homedir } from 'os'
import { promisify } from 'util'
import { z } from 'zod'

const execAsync = promisify(exec)

export const terminal = tool({
  description:
    "Execute a shell command on the local machine and return its output. Use this to run CLI tools, scripts, or any shell command. Commands run in the user's home directory by default.",
  inputSchema: z.object({
    command: z.string().describe('The shell command to execute.'),
    cwd: z
      .string()
      .optional()
      .describe(
        'Working directory for the command. Defaults to the user home directory.'
      )
  }),
  execute: async ({ command, cwd }) => {
    const workDir = cwd ?? homedir()
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: workDir,
        timeout: 30_000,
        maxBuffer: 1024 * 1024 * 10 // 10 MB
      })
      return {
        command,
        cwd: workDir,
        exitCode: 0,
        stdout: stdout.trimEnd(),
        stderr: stderr.trimEnd()
      }
    } catch (err: unknown) {
      const e = err as {
        code?: number
        stdout?: string
        stderr?: string
        message?: string
      }
      return {
        command,
        cwd: workDir,
        exitCode: e.code ?? 1,
        stdout: (e.stdout ?? '').trimEnd(),
        stderr: (e.stderr ?? e.message ?? 'Unknown error').trimEnd()
      }
    }
  }
})
