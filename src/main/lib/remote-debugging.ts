/**
 * Chromium's remote-debugging switches (`--remote-debugging-port`, `-pipe`,
 * `-address`) open a DevTools endpoint that evaluates script in any page —
 * including the main window's top frame, the one context the presence token
 * (`presence.ts`) is handed to. The `EnableNodeCliInspectArguments` fuse
 * covers Node's `--inspect` only; Electron has no fuse for these. A local
 * process (the model's `terminal`) could relaunch the packaged app with one
 * and read the token, so a packaged build refuses to start with them.
 *
 * Checked before anything else in `main.ts`, before `ready` and before any
 * window exists. Exiting (rather than only `removeSwitch`) is what makes it
 * independent of when Chromium starts its DevTools handler: the process is
 * gone before a renderer could be inspected. The switches are removed as
 * well, belt and braces. Dev builds keep them (and DevTools) as they are.
 */
export const REMOTE_DEBUGGING_SWITCHES = [
  'remote-debugging-port',
  'remote-debugging-pipe',
  'remote-debugging-address'
] as const

/** `--remote-debugging-port=9222`, `-remote-debugging-pipe`, any case. */
const ARG_PATTERN = /^--?remote-debugging-(?:port|pipe|address)(?:=|$)/iu

export interface RemoteDebuggingEnv {
  isPackaged: boolean
  argv: readonly string[]
  commandLine: {
    hasSwitch(name: string): boolean
    removeSwitch(name: string): void
  }
  exit(code: number): void
  log(message: string, attributes: Record<string, unknown>): void
}

/** Returns true when it refused (and asked the process to exit). */
export function refuseRemoteDebugging(env: RemoteDebuggingEnv): boolean {
  if (!env.isPackaged) return false
  const present = REMOTE_DEBUGGING_SWITCHES.filter((name) =>
    env.commandLine.hasSwitch(name)
  )
  const inArgv = env.argv.some((arg) => ARG_PATTERN.test(arg))
  for (const name of REMOTE_DEBUGGING_SWITCHES) {
    env.commandLine.removeSwitch(name)
  }
  if (present.length === 0 && !inArgv) return false
  env.log('Refusing to start with a remote-debugging switch', {
    switches: present,
    inArgv
  })
  env.exit(1)
  return true
}
