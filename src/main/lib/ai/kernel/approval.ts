import { realpathSync } from 'fs'
import { homedir } from 'os'
import { basename, dirname, isAbsolute, join, resolve, sep } from 'path'

import { TOOL_NAMES } from '@exodus/shared/constants/tool-names'

/**
 * The approval gate for secrets outside Exodus (spec 2026-09-25 §2.5).
 *
 * Exodus's own secrets are defended without exception elsewhere (encrypted at
 * rest, masked by the API). Secrets elsewhere on the machine — SSH keys, cloud
 * credentials, `.env` files — are sometimes exactly what a task needs, so a
 * tool call that touches one is paused and the user decides: `sensitiveTarget`
 * says which calls, `pending-approvals.ts` holds each paused call until a decision
 * (`POST /api/v1/chat/approval`), a timeout or Stop settles it.
 *
 * Two files are never the user's decision: `~/.exodus/lock.dat` (the PIN
 * secret) and `~/.exodus/tls/` (the LAN certificate's key). A call that
 * touches them is refused without asking. The rest of `~/.exodus` stays
 * readable — it holds only ciphertext and non-secret data.
 *
 * The terminal rule is a documented heuristic, not a shell parser: a command
 * that names a sensitive path (`cat ~/.ssh/id_rsa`, `cd ~/.aws && cat
 * credentials`) or reads the keychain (`security find-generic-password`) is
 * gated. An obfuscated command gets past it; one that merely mentions `.ssh`
 * in an `echo` is asked about (an accepted false positive).
 */

export type SensitiveKind = 'ask' | 'refuse'

export interface SensitiveTarget {
  /** `ask`: pause for the user. `refuse`: blocked outright, nothing asked. */
  kind: SensitiveKind
  /** What the call touches — a path (home as `~`) or the command. Never contents. */
  summary: string
}

export interface MatchEnv {
  home: string
  exodusHome: string
  /** Where a relative path given to a file tool lands (the process's cwd). */
  cwd: string
}

function defaultEnv(): MatchEnv {
  const home = homedir()
  return {
    home,
    exodusHome: process.env.EXODUS_HOME || join(home, '.exodus'),
    cwd: process.cwd()
  }
}

const MAX_COMMAND_SUMMARY = 300

/** Directories (and single files) under home whose contents are credentials. */
const HOME_SECRET_ROOTS = [
  '.ssh',
  '.aws',
  '.gnupg',
  '.kube',
  join('.docker', 'config.json'),
  '.netrc',
  join('Library', 'Keychains')
]

/** Keychains outside home. */
const SYSTEM_SECRET_ROOTS = ['/Library/Keychains', '/System/Library/Keychains']

/** A file whose name alone says it holds a secret — gated outside the workspace. */
function isSecretFileName(name: string): boolean {
  const lower = name.toLowerCase()
  return (
    lower.startsWith('.env') ||
    lower.endsWith('.pem') ||
    lower.endsWith('.key') ||
    lower.startsWith('id_')
  )
}

function isWithin(child: string, parent: string): boolean {
  return (
    child === parent ||
    child.startsWith(parent.endsWith(sep) ? parent : parent + sep)
  )
}

/**
 * The path with every symlink resolved — of the path itself when it exists,
 * else of its nearest existing ancestor (so a new file under a symlinked
 * directory still resolves). Never throws.
 */
function realish(path: string): string {
  let current = path
  const rest: string[] = []
  for (;;) {
    try {
      return join(realpathSync(current), ...rest)
    } catch {
      const parent = dirname(current)
      if (parent === current) return path
      rest.unshift(basename(current))
      current = parent
    }
  }
}

/** A path and its symlink-resolved form (one entry when they agree). */
function forms(path: string): string[] {
  const real = realish(path)
  return real === path ? [path] : [path, real]
}

function expandHome(path: string, home: string): string {
  if (path === '~') return home
  if (path.startsWith('~/')) return join(home, path.slice(2))
  const m = /^(\$HOME|\$\{HOME\})(\/.*)?$/u.exec(path)
  if (m) return join(home, m[2] ?? '')
  return path
}

function display(path: string, home: string): string {
  return isWithin(path, home) && path !== home
    ? `~${path.slice(home.length)}`
    : path
}

interface Roots {
  refused: string[]
  secret: string[]
  config: string[]
  workspace: string[]
}

function rootsOf(env: MatchEnv, workspaceDir: string | undefined): Roots {
  const refused = [
    join(env.exodusHome, 'lock.dat'),
    join(env.exodusHome, 'tls')
  ].flatMap(forms)
  const secret = [
    ...HOME_SECRET_ROOTS.map((r) => join(env.home, r)),
    ...SYSTEM_SECRET_ROOTS
  ].flatMap(forms)
  const config = forms(join(env.home, '.config'))
  const workspace = workspaceDir ? forms(resolve(workspaceDir)) : []
  return { refused, secret, config, workspace }
}

/**
 * How one absolute path is classified: `refuse` (Exodus's own lock/TLS
 * secrets), `ask` (a credential location, or a secret-named file outside the
 * workspace), or null. Both the path as written and its symlink-resolved form
 * are checked, so a link in the workspace pointing at `~/.ssh/id_rsa` is
 * caught, and a real `.env` in the workspace is not.
 */
function classifyPath(
  path: string,
  roots: Roots,
  opts: { recursive?: boolean } = {}
): { kind: SensitiveKind; via: string } | null {
  const candidates = forms(path)
  const refused = candidates.find((p) =>
    roots.refused.some((r) => isWithin(p, r))
  )
  if (refused) return { kind: 'refuse', via: refused }
  for (const p of candidates) {
    const ask = { kind: 'ask' as const, via: p }
    if (roots.secret.some((r) => isWithin(p, r))) return ask
    if (
      roots.config.some((r) => isWithin(p, r)) &&
      basename(p).toLowerCase().startsWith('credentials')
    ) {
      return ask
    }
    if (/\.keychain(-db)?$/iu.test(p)) return ask
    const inWorkspace = roots.workspace.some((w) => isWithin(p, w))
    if (!inWorkspace && isSecretFileName(basename(p))) return ask
    // A recursive read (grep) of a directory that contains a credential
    // location reads that location too.
    if (
      opts.recursive &&
      [...roots.secret, ...roots.refused].some((r) => isWithin(r, p))
    ) {
      return ask
    }
  }
  return null
}

const PATH_TOOLS: Record<string, string> = {
  [TOOL_NAMES.readFile]: 'path',
  [TOOL_NAMES.writeFile]: 'path',
  [TOOL_NAMES.editFile]: 'path',
  [TOOL_NAMES.listDirectory]: 'path',
  [TOOL_NAMES.grep]: 'path',
  [TOOL_NAMES.findFiles]: 'searchPath'
}

function stringArg(args: unknown, key: string): string | null {
  if (!args || typeof args !== 'object') return null
  const value = (args as Record<string, unknown>)[key]
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

/** Refuse wins over ask; the first path that decides is the summary. */
function strongest(
  hits: Array<{ kind: SensitiveKind; summary: string }>
): SensitiveTarget | null {
  return hits.find((h) => h.kind === 'refuse') ?? hits[0] ?? null
}

function matchPathTool(
  toolName: string,
  raw: string,
  roots: Roots,
  env: MatchEnv,
  workspaceDir: string | undefined
): SensitiveTarget | null {
  const expanded = expandHome(raw.trim(), env.home)
  // A relative path lands where the process runs (what `fs` does); the
  // workspace is checked too, since that is where the model means it.
  const bases = isAbsolute(expanded)
    ? ['']
    : [env.cwd, ...(workspaceDir ? [workspaceDir] : [])]
  const hits: SensitiveTarget[] = []
  for (const base of bases) {
    const abs = base ? resolve(base, expanded) : resolve(expanded)
    const hit = classifyPath(abs, roots, {
      recursive: toolName === TOOL_NAMES.grep
    })
    if (!hit) continue
    // A link is shown with what it points at — that is what gets read.
    const summary =
      hit.via === abs
        ? display(abs, env.home)
        : `${display(abs, env.home)} → ${display(hit.via, env.home)}`
    hits.push({ kind: hit.kind, summary })
  }
  return strongest(hits)
}

// ── terminal ─────────────────────────────────────────────────────────────────

/** Reading the macOS keychain from the shell. */
const KEYCHAIN_COMMAND =
  /\bsecurity\s+(?:find-[a-z-]*password|dump-keychain|export)\b/u

/** A credential location named anywhere in a command, however it is spelled. */
const SECRET_MENTION =
  /(?:^|[\s'"=:(/`])(?:\.ssh|\.aws|\.gnupg|\.kube|\.netrc|\.docker\/config\.json|Library\/Keychains)(?=$|[\s'"/;|&)<>`])/u

const REFUSED_MENTION = /\.exodus\/(?:lock\.dat|tls)(?=$|[\s'"/;|&)<>`])/u
/** `cd ~/.exodus && cat lock.dat` — the directory and the file named apart. */
const EXODUS_MENTION = /\.exodus(?=$|[\s'"/;|&)<>`])/u
const LOCK_OR_TLS_WORD = /(?:^|[\s'"/])(?:lock\.dat|tls)(?=$|[\s'"/;|&)<>`])/u

/** Paths considered per command — a heredoc script is not walked word by word. */
const MAX_COMMAND_TOKENS = 2000

function commandSummary(command: string): string {
  const oneLine = command.trim()
  return oneLine.length > MAX_COMMAND_SUMMARY
    ? `${oneLine.slice(0, MAX_COMMAND_SUMMARY)}…`
    : oneLine
}

function matchCommand(
  command: string,
  cwdArg: string | null,
  roots: Roots,
  env: MatchEnv,
  workspaceDir: string | undefined
): SensitiveTarget | null {
  const summary = commandSummary(command)
  if (
    REFUSED_MENTION.test(command) ||
    (EXODUS_MENTION.test(command) && LOCK_OR_TLS_WORD.test(command))
  ) {
    return { kind: 'refuse', summary }
  }

  const cwd = cwdArg
    ? resolve(expandHome(cwdArg, env.home))
    : (workspaceDir ?? env.home)
  let ask =
    KEYCHAIN_COMMAND.test(command) ||
    SECRET_MENTION.test(command) ||
    classifyPath(cwd, roots) !== null

  // Every word that could be a path, resolved as the shell would from `cwd`.
  const tokens = command
    .split(/[\s'"`;|&<>(),=]+/u)
    .slice(0, MAX_COMMAND_TOKENS)
  for (const token of tokens) {
    if (!token || token.startsWith('-') || token.includes('://')) continue
    const expanded = expandHome(token, env.home)
    const kind = classifyPath(resolve(cwd, expanded), roots)?.kind
    if (kind === 'refuse') return { kind: 'refuse', summary }
    if (kind === 'ask') ask = true
  }
  return ask ? { kind: 'ask', summary } : null
}

/**
 * Whether a tool call touches a secret outside Exodus (`ask`), one of
 * Exodus's own that is never handed out (`refuse`), or neither (null).
 * `workspaceDir` is the chat's workspace: secret-named files inside it are
 * the model's own and pass. Pure apart from `realpath` on the paths it is
 * given; `env` is for tests.
 */
export function sensitiveTarget(
  toolName: string,
  args: unknown,
  workspaceDir?: string,
  env: MatchEnv = defaultEnv()
): SensitiveTarget | null {
  const roots = rootsOf(env, workspaceDir)
  if (toolName === TOOL_NAMES.terminal) {
    const command = stringArg(args, 'command')
    if (!command) return null
    return matchCommand(
      command,
      stringArg(args, 'cwd'),
      roots,
      env,
      workspaceDir
    )
  }
  const key = PATH_TOOLS[toolName]
  if (!key) return null
  const path = stringArg(args, key)
  if (!path) return null
  return matchPathTool(toolName, path, roots, env, workspaceDir)
}

/** What the model reads when the user (or the clock, or Stop) says no. */
export function declinedReason(summary: string): string {
  return `The user declined access to ${summary}.`
}

/** What the model reads for Exodus's own lock/TLS secrets. */
export function refusedReason(summary: string): string {
  return `Access to ${summary} is refused: it touches Exodus's own lock or TLS secrets, which are never read by tools.`
}
