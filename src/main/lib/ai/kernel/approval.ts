import { type Dirent, lstatSync, readdirSync, realpathSync } from 'fs'
import { homedir } from 'os'
import { basename, dirname, isAbsolute, join, resolve, sep } from 'path'

import { TOOL_NAMES } from '@exodus/shared/constants/tool-names'

import { GREP_SKIP_DIRS } from '../calling-tools/grep-skip-dirs'

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
  /**
   * Whether the filesystem ignores case — macOS's (and Windows') default
   * does, so `~/.SSH/id_rsa` opens `~/.ssh/id_rsa` and must match it.
   * Defaults to the platform.
   */
  caseInsensitive?: boolean
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

/** Set per `sensitiveTarget` call from `MatchEnv.caseInsensitive`. */
let foldCase = process.platform === 'darwin' || process.platform === 'win32'

/** macOS firmlinks: `/System/Volumes/Data/Users/…` is `/Users/…`. */
const FIRMLINK_PREFIX = '/System/Volumes/Data/'

/** The form paths are compared in: firmlink prefix dropped, case folded
 *  where the filesystem ignores it. Never shown to anyone. */
function canon(path: string): string {
  const unlinked = path.startsWith(FIRMLINK_PREFIX)
    ? path.slice(FIRMLINK_PREFIX.length - 1)
    : path
  return foldCase ? unlinked.toLowerCase() : unlinked
}

function isWithin(child: string, parent: string): boolean {
  const c = canon(child)
  const p = canon(parent)
  return c === p || c.startsWith(p.endsWith(sep) ? p : p + sep)
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
  const shown = path.startsWith(FIRMLINK_PREFIX)
    ? path.slice(FIRMLINK_PREFIX.length - 1)
    : path
  return isWithin(shown, home) && canon(shown) !== canon(home)
    ? `~${shown.slice(home.length)}`
    : shown
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

/** Entries a grep-root scan looks at before it gives up and asks anyway. */
const MAX_SCAN_ENTRIES = 20_000
const TOO_MANY = '\u0000too-many'

/**
 * The first file under `root` (not inside the workspace) that the file tools
 * would ask about by name — `.env*`, `*.pem`, `*.key`, `id_*`, a keychain, a
 * `credentials*` under `~/.config` — or `TOO_MANY` when the tree is too large
 * to tell. Walks as `grep` does (its skipped directories, depth 8) and, like
 * it, never follows a symlink. Null for a file or a missing root.
 */
function findSecretInTree(root: string, roots: Roots): string | null {
  let seen = 0
  const walk = (dir: string, depth: number): string | null => {
    if (depth > 8) return null
    let entries: Dirent[]
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return null
    }
    for (const entry of entries) {
      if (++seen > MAX_SCAN_ENTRIES) return TOO_MANY
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (GREP_SKIP_DIRS.has(entry.name)) continue
        if (roots.workspace.some((w) => isWithin(full, w))) continue
        const found = walk(full, depth + 1)
        if (found) return found
      } else if (entry.isFile()) {
        const lower = entry.name.toLowerCase()
        if (
          isSecretFileName(entry.name) ||
          /\.keychain(-db)?$/u.test(lower) ||
          (lower.startsWith('credentials') &&
            roots.config.some((r) => isWithin(full, r)))
        ) {
          return full
        }
      }
    }
    return null
  }
  if (roots.workspace.some((w) => isWithin(root, w))) return null
  try {
    if (!lstatSync(root).isDirectory()) return null
  } catch {
    return null
  }
  return walk(root, 0)
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
    if (!hit) {
      // A grep reads every file under its root: a root outside the workspace
      // asks as `read_file` would when the tree holds a secret-named file.
      if (toolName === TOOL_NAMES.grep) {
        const found = findSecretInTree(realish(abs), roots)
        if (found) {
          const why =
            found === TOO_MANY ? 'too large to check' : display(found, env.home)
          hits.push({
            kind: 'ask',
            summary: `${display(abs, env.home)} (${found === TOO_MANY ? why : `contains ${why}`})`
          })
        }
      }
      continue
    }
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
  /(?:^|[\s'"=:(/`])(?:\.ssh|\.aws|\.gnupg|\.kube|\.netrc|\.docker\/config\.json|Library\/Keychains)(?=$|[\s'"/;|&)<>`])/iu

const REFUSED_MENTION = /\.exodus\/(?:lock\.dat|tls)(?=$|[\s'"/;|&)<>`])/iu
/** `cd ~/.exodus && cat lock.dat` — the directory and the file named apart. */
const EXODUS_MENTION = /\.exodus(?=$|[\s'"/;|&)<>`])/iu
const LOCK_OR_TLS_WORD = /(?:^|[\s'"/])(?:lock\.dat|tls)(?=$|[\s'"/;|&)<>`])/iu

/** Paths considered per command — a heredoc script is not walked word by word. */
const MAX_COMMAND_TOKENS = 2000

function commandSummary(command: string): string {
  const oneLine = command.trim()
  return oneLine.length > MAX_COMMAND_SUMMARY
    ? `${oneLine.slice(0, MAX_COMMAND_SUMMARY)}…`
    : oneLine
}

/**
 * The summary of a gated command: what triggered it first — the path or the
 * keychain call — then the command, cut at 300 characters. A command padded
 * so its real target falls past the cut still shows why it paused.
 */
function withTrigger(trigger: string, command: string): string {
  return `${trigger} — ${commandSummary(command)}`
}

function matchCommand(
  command: string,
  cwdArg: string | null,
  roots: Roots,
  env: MatchEnv,
  workspaceDir: string | undefined
): SensitiveTarget | null {
  const refusedMention =
    REFUSED_MENTION.exec(command)?.[0] ??
    (EXODUS_MENTION.test(command)
      ? LOCK_OR_TLS_WORD.exec(command)?.[0].trim()
      : undefined)
  if (refusedMention) {
    return { kind: 'refuse', summary: withTrigger(refusedMention, command) }
  }

  const cwd = cwdArg
    ? resolve(expandHome(cwdArg, env.home))
    : (workspaceDir ?? env.home)

  // Every word that could be a path, resolved as the shell would from `cwd`.
  // A path is the most telling trigger, so it is looked for first.
  let pathTrigger: string | null = null
  const tokens = command
    .split(/[\s'"`;|&<>(),=]+/u)
    .slice(0, MAX_COMMAND_TOKENS)
  for (const token of tokens) {
    if (!token || token.startsWith('-') || token.includes('://')) continue
    const abs = resolve(cwd, expandHome(token, env.home))
    const hit = classifyPath(abs, roots)
    if (hit?.kind === 'refuse') {
      return {
        kind: 'refuse',
        summary: withTrigger(display(abs, env.home), command)
      }
    }
    if (hit && !pathTrigger) pathTrigger = display(abs, env.home)
  }

  const trigger =
    pathTrigger ??
    SECRET_MENTION.exec(command)?.[0].replace(/^[\s'"=:(/`]/u, '') ??
    KEYCHAIN_COMMAND.exec(command)?.[0] ??
    (classifyPath(cwd, roots) ? display(cwd, env.home) : null)
  return trigger
    ? { kind: 'ask', summary: withTrigger(trigger, command) }
    : null
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
  foldCase =
    env.caseInsensitive ??
    (process.platform === 'darwin' || process.platform === 'win32')
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

/** What a Philharmonic Group run reads: no one can approve there. */
export function groupRefusedReason(summary: string): string {
  return `Access to ${summary} is not available in a Group run.`
}

/** What the model reads for Exodus's own lock/TLS secrets. */
export function refusedReason(summary: string): string {
  return `Access to ${summary} is refused: it touches Exodus's own lock or TLS secrets, which are never read by tools.`
}
