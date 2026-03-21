import { exec } from 'child_process'
import { homedir } from 'os'
import { promisify } from 'util'

import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'

const execAsync = promisify(exec)

const terminalSchema = Type.Object({
  command: Type.String({ description: 'The shell command to execute.' }),
  cwd: Type.Optional(
    Type.String({
      description:
        'Working directory for the command. Defaults to the user home directory.'
    })
  )
})

export const terminal: AgentTool<typeof terminalSchema> = {
  name: 'terminal',
  label: 'Terminal',
  description:
    "Execute a shell command on the local machine and return its output. Use this to run CLI tools, scripts, or any shell command. Commands run in the user's home directory by default.",
  parameters: terminalSchema,
  execute: async (_toolCallId, { command, cwd }) => {
    const workDir = cwd ?? homedir()
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: workDir,
        timeout: 30_000,
        maxBuffer: 1024 * 1024 * 10 // 10 MB
      })
      const details = {
        command,
        cwd: workDir,
        exitCode: 0,
        stdout: stdout.trimEnd(),
        stderr: stderr.trimEnd()
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(details) }],
        details
      }
    } catch (err: unknown) {
      const e = err as {
        code?: number
        stdout?: string
        stderr?: string
        message?: string
      }
      const details = {
        command,
        cwd: workDir,
        exitCode: e.code ?? 1,
        stdout: (e.stdout ?? '').trimEnd(),
        stderr: (e.stderr ?? e.message ?? 'Unknown error').trimEnd()
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(details) }],
        details
      }
    }
  }
}
