import { type Dir, promises as fsp } from 'fs'
import { homedir } from 'os'
import { basename, dirname, isAbsolute, join, resolve, sep } from 'path'
import { fileURLToPath } from 'url'

import { LAN_SERVER_PORT, SERVER_PORT } from '@exodus/shared/constants/systems'
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
 * Some of Exodus's own files are never the user's decision, and a call that
 * touches them is refused without asking: `~/.exodus/lock.dat` (the PIN
 * secret), `~/.exodus/tls/` (the LAN certificate's key), and the raw data —
 * `~/.exodus/database` (PGlite), `~/.exodus/backups` (its archives) and
 * `~/.exodus/analytics` (the DuckDB copy). Those last three are ciphertext
 * only while encryption at rest is on: a backup written before it existed,
 * and every file while `safeStorage` is unavailable, holds keys in plaintext
 * — and no tool has a use for raw database files (chats are read through
 * `lcm_*`). The rest of `~/.exodus` (the chat workspaces, media, logs) stays
 * readable.
 *
 * The terminal rule is a documented heuristic, not a shell parser: a command
 * that names a sensitive path (`cat ~/.ssh/id_rsa`, `cd ~/.aws && cat
 * credentials`), reads the keychain or a CLI's stored token (`security
 * find-generic-password`, `gh auth token`), or lists other processes'
 * arguments (`ps -axo args` — an MCP server started with `--api-key …` shows
 * it there) is gated. An obfuscated command gets past it; one that merely
 * mentions `.ssh` in an `echo` is asked about (an accepted false positive).
 *
 * `call_mcp_tool` is gated the same way: every string in its `arguments` is
 * checked as a path and as a command, and a URL at Exodus's own API ports is
 * refused — an MCP filesystem or fetch server is otherwise a side door past
 * both rules.
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
  join('Library', 'Keychains'),
  // Package-registry and VCS tokens.
  '.npmrc',
  '.yarnrc.yml',
  '.pypirc',
  '.git-credentials',
  '.vault-token',
  // Cloud and CLI credential stores.
  '.azure',
  join('.config', 'gh'),
  join('.config', 'gcloud'),
  join('.config', 'op'),
  '.password-store',
  // Browser profiles: saved passwords (`Login Data`, Firefox's `logins.json`
  // + `key4.db`, readable without a primary password) and cookies.
  join('Library', 'Application Support', 'Google', 'Chrome'),
  join('Library', 'Application Support', 'Chromium'),
  join('Library', 'Application Support', 'BraveSoftware'),
  join('Library', 'Application Support', 'Microsoft Edge'),
  join('Library', 'Application Support', 'Firefox'),
  join('Library', 'Application Support', 'Arc'),
  join('Library', 'Cookies'),
  '.mozilla',
  join('.config', 'google-chrome'),
  join('.config', 'chromium'),
  join('.config', 'BraveSoftware'),
  join('.config', 'microsoft-edge')
]

/**
 * Directories under home where any file with `credentials` in its name is one
 * (`~/.config/gcloud/application_default_credentials.json`,
 * `~/.cargo/credentials.toml`, `~/.terraform.d/credentials.tfrc.json`).
 */
const HOME_CREDENTIAL_NAME_DIRS = ['.config', '.cargo', '.terraform.d']

/** Exodus's own files no tool ever touches (relative to `~/.exodus`). */
const EXODUS_REFUSED = ['lock.dat', 'tls', 'database', 'backups', 'analytics']

/** Keychains outside home. */
const SYSTEM_SECRET_ROOTS = ['/Library/Keychains', '/System/Library/Keychains']

/**
 * A trailing marker that turns a secret-shaped name into a template/example
 * file, never itself a secret: `.env.example`, `.env.sample`, `.env.template`,
 * `.env.dist`, `id_rsa.example`, `server.key.template`, …
 */
const TEMPLATE_SUFFIXES = ['.example', '.sample', '.template', '.dist']

/**
 * A trailing marker that leaves a secret a secret: a backup copy of a key
 * (`server.pem.bak`, `id_rsa.old`, `tls.key~`) holds the same key.
 */
const BACKUP_SUFFIXES = ['.bak', '.old', '.orig', '.backup', '.save', '~']

function withoutBackupSuffixes(lower: string): string {
  let name = lower
  for (;;) {
    const suffix = BACKUP_SUFFIXES.find(
      (s) => name.endsWith(s) && name.length > s.length
    )
    if (!suffix) return name
    name = name.slice(0, -suffix.length)
  }
}

/** A file whose name alone says it holds a secret — gated outside the workspace. */
function isSecretFileName(name: string): boolean {
  const lower = withoutBackupSuffixes(name.toLowerCase())
  if (TEMPLATE_SUFFIXES.some((s) => lower.endsWith(s))) return false
  return (
    lower.startsWith('.env') ||
    lower.endsWith('.pem') ||
    lower.endsWith('.key') ||
    lower.startsWith('id_') ||
    lower === '.git-credentials' ||
    lower === '.vault-token'
  )
}

/**
 * From `MatchEnv.caseInsensitive`, defaulting to the platform. Threaded
 * through every call explicitly (never shared module state): the matcher
 * runs with real `await`s now (the grep tree scan), so two calls can be in
 * flight together — a mutable module-level flag would let one call's
 * case-folding leak into another's.
 */
function foldCaseOf(env: MatchEnv): boolean {
  return (
    env.caseInsensitive ??
    (process.platform === 'darwin' || process.platform === 'win32')
  )
}

/** macOS firmlinks: `/System/Volumes/Data/Users/…` is `/Users/…`. */
const FIRMLINK_PREFIX = '/System/Volumes/Data/'

/** The form paths are compared in: firmlink prefix dropped, case folded
 *  where the filesystem ignores it. Never shown to anyone. */
function canon(path: string, env: MatchEnv): string {
  const unlinked = path.startsWith(FIRMLINK_PREFIX)
    ? path.slice(FIRMLINK_PREFIX.length - 1)
    : path
  return foldCaseOf(env) ? unlinked.toLowerCase() : unlinked
}

function isWithin(child: string, parent: string, env: MatchEnv): boolean {
  const c = canon(child, env)
  const p = canon(parent, env)
  return c === p || c.startsWith(p.endsWith(sep) ? p : p + sep)
}

/**
 * How long one call's symlink resolution may take in all. `realpath` on an
 * unresponsive network mount can block far longer; every resolution is async
 * and raced against this, and a path still unresolved when it passes is asked
 * about (S6 minor) — never waited on, which would hold `beforeToolCall` (and
 * the HTTP server, IPC, every other run's SSE) behind the mount.
 */
const RESOLVE_DEADLINE_MS = 250
const TIMED_OUT = Symbol('timed-out')

/** A path and its symlink-resolved form, and whether resolving it timed out. */
interface PathForms {
  forms: string[]
  unchecked: boolean
}

/**
 * Symlink resolution for one `sensitiveTarget` call: memoized, async, and
 * bounded by one shared deadline. A path under a network root is never
 * resolved at all (`realpath` itself can hang there).
 */
class PathResolver {
  private readonly cache = new Map<string, Promise<string | typeof TIMED_OUT>>()
  private readonly deadline: Promise<typeof TIMED_OUT>
  private timer: ReturnType<typeof setTimeout> | undefined

  constructor(
    private readonly env: MatchEnv,
    ms = RESOLVE_DEADLINE_MS
  ) {
    this.deadline = new Promise((settle) => {
      this.timer = setTimeout(() => settle(TIMED_OUT), ms)
      this.timer.unref?.()
    })
  }

  dispose(): void {
    clearTimeout(this.timer)
  }

  /**
   * The path with every symlink resolved — of the path itself when it
   * exists, else of its nearest existing ancestor (so a new file under a
   * symlinked directory still resolves) — or `TIMED_OUT`. Never throws.
   */
  real(path: string): Promise<string | typeof TIMED_OUT> {
    if (isNetworkRoot(path, this.env)) return Promise.resolve(path)
    let hit = this.cache.get(path)
    if (!hit) {
      hit = this.resolve(path)
      this.cache.set(path, hit)
    }
    return hit
  }

  private async resolve(path: string): Promise<string | typeof TIMED_OUT> {
    let current = path
    const rest: string[] = []
    for (;;) {
      const attempt = fsp.realpath(current).then(
        (value) => ({ ok: true as const, value }),
        () => ({ ok: false as const })
      )
      const r = await Promise.race([attempt, this.deadline])
      if (r === TIMED_OUT) return TIMED_OUT
      if (r.ok) return join(r.value, ...rest)
      const parent = dirname(current)
      if (parent === current) return path
      rest.unshift(basename(current))
      current = parent
    }
  }

  /** A path and its symlink-resolved form (one entry when they agree). */
  async forms(path: string): Promise<PathForms> {
    const real = await this.real(path)
    if (real === TIMED_OUT) return { forms: [path], unchecked: true }
    return { forms: real === path ? [path] : [path, real], unchecked: false }
  }

  /** `forms` for a root: a root not resolved in time is used as written. */
  async rootForms(path: string): Promise<string[]> {
    return (await this.forms(path)).forms
  }
}

function expandHome(path: string, home: string): string {
  if (path === '~') return home
  if (path.startsWith('~/')) return join(home, path.slice(2))
  const m = /^(\$HOME|\$\{HOME\})(\/.*)?$/u.exec(path)
  if (m) return join(home, m[2] ?? '')
  return path
}

function display(path: string, env: MatchEnv): string {
  const { home } = env
  const shown = path.startsWith(FIRMLINK_PREFIX)
    ? path.slice(FIRMLINK_PREFIX.length - 1)
    : path
  return isWithin(shown, home, env) && canon(shown, env) !== canon(home, env)
    ? `~${shown.slice(home.length)}`
    : shown
}

interface Roots {
  resolver: PathResolver
  refused: string[]
  secret: string[]
  /** Where a file named `*credentials*` is one. */
  credentialDirs: string[]
  /** `~/.exodus` itself — a copy of all of it copies the database. */
  exodusHome: string[]
  workspace: string[]
}

async function rootsOf(
  env: MatchEnv,
  workspaceDir: string | undefined,
  resolver: PathResolver
): Promise<Roots> {
  const all = async (paths: string[]) =>
    (await Promise.all(paths.map((p) => resolver.rootForms(p)))).flat()
  const [refused, secret, credentialDirs, workspace, exodusHome] =
    await Promise.all([
      all(EXODUS_REFUSED.map((r) => join(env.exodusHome, r))),
      all([
        ...HOME_SECRET_ROOTS.map((r) => join(env.home, r)),
        ...SYSTEM_SECRET_ROOTS
      ]),
      all(HOME_CREDENTIAL_NAME_DIRS.map((r) => join(env.home, r))),
      workspaceDir ? all([resolve(workspaceDir)]) : Promise.resolve([]),
      all([env.exodusHome])
    ])
  return {
    resolver,
    refused,
    secret,
    credentialDirs,
    exodusHome,
    workspace
  }
}

/** A `*credentials*` file under `~/.config`, `~/.cargo` or `~/.terraform.d`. */
function isCredentialNamed(path: string, roots: Roots, env: MatchEnv): boolean {
  return (
    withoutBackupSuffixes(basename(path).toLowerCase()).includes(
      'credentials'
    ) && roots.credentialDirs.some((r) => isWithin(path, r, env))
  )
}

/**
 * How one absolute path is classified: `refuse` (Exodus's own lock/TLS
 * secrets), `ask` (a credential location, or a secret-named file outside the
 * workspace), or null. Both the path as written and its symlink-resolved form
 * are checked, so a link in the workspace pointing at `~/.ssh/id_rsa` is
 * caught, and a real `.env` in the workspace is not.
 */
async function classifyPath(
  path: string,
  roots: Roots,
  env: MatchEnv,
  opts: { recursive?: boolean } = {}
): Promise<{ kind: SensitiveKind; via: string; unchecked?: boolean } | null> {
  const { forms: candidates, unchecked } = await roots.resolver.forms(path)
  const refused = candidates.find((p) =>
    roots.refused.some((r) => isWithin(p, r, env))
  )
  if (refused) return { kind: 'refuse', via: refused }
  for (const p of candidates) {
    const ask = { kind: 'ask' as const, via: p }
    if (roots.secret.some((r) => isWithin(p, r, env))) return ask
    if (isCredentialNamed(p, roots, env)) return ask
    if (/\.keychain(-db)?$/iu.test(p)) return ask
    const inWorkspace = roots.workspace.some((w) => isWithin(p, w, env))
    if (!inWorkspace && isSecretFileName(basename(p))) return ask
    // A recursive read (grep) of a directory that contains a credential
    // location reads that location too.
    if (
      opts.recursive &&
      [...roots.secret, ...roots.refused].some((r) => isWithin(r, p, env))
    ) {
      return ask
    }
  }
  // Where it really points could not be told in time: asked about, never
  // waited on (fail closed).
  if (unchecked) return { kind: 'ask', via: path, unchecked: true }
  return null
}

/** Entries a grep-root scan looks at before it gives up and asks anyway. */
const MAX_SCAN_ENTRIES = 20_000
const TOO_MANY = '\u0000too-many'
/** A mount or cloud-sync root: asked about without ever being read (below). */
const NETWORK_VOLUME = '\u0000network-volume'
/** A tree whose walk failed midway (EIO, a vanished mount): asked about. */
const UNREADABLE = '\u0000unreadable'

/**
 * How long a grep-root scan may run before it gives up and asks anyway. An
 * unresponsive network mount can block a `readdir`/`lstat` syscall for far
 * longer than this — the scan is raced against a timer, not just counted, so
 * that a hung mount cannot hang `beforeToolCall` (and with it the HTTP
 * server, IPC and every other run's SSE) past this bound.
 */
const SCAN_DEADLINE_MS = 250

/** Mount points and cloud-sync folders that can hang on an unresponsive
 *  server — asked about without ever touching them (`lstat`/`opendir`
 *  included). Case-folded and firmlink-normalised like every other root. */
function isNetworkRoot(path: string, env: MatchEnv): boolean {
  const roots = [
    '/Volumes',
    '/net',
    '/Network',
    join(env.home, 'Library', 'CloudStorage')
  ]
  return roots.some((r) => isWithin(path, r, env))
}

/**
 * The first file under `root` (not inside the workspace) that the file tools
 * would ask about by name — `.env*`, `*.pem`, `*.key`, `id_*`, a keychain, a
 * `*credentials*` under `~/.config` — or `TOO_MANY` when the tree is too large
 * or slow to tell, or `NETWORK_VOLUME` when `root` is a mount/cloud-sync
 * folder never walked at all. Walks as `grep` does (its skipped directories,
 * depth 8) and, like it, never follows a symlink. Null for a file or a
 * missing root. Every filesystem call is async and raced against
 * `SCAN_DEADLINE_MS`; entries still being read when the deadline wins are
 * closed on a best-effort basis, but the walk itself does not block the
 * caller past the deadline.
 */
async function findSecretInTree(
  root: string,
  roots: Roots,
  env: MatchEnv
): Promise<string | null> {
  if (roots.workspace.some((w) => isWithin(root, w, env))) return null
  if (isNetworkRoot(root, env)) return NETWORK_VOLUME

  let seen = 0
  let deadlineHit = false
  const openDirs = new Set<Dir>()

  const walk = async (dir: string, depth: number): Promise<string | null> => {
    if (deadlineHit) return TOO_MANY
    if (depth > 8) return null
    let handle: Dir
    try {
      handle = await fsp.opendir(dir)
    } catch {
      return null
    }
    if (deadlineHit) {
      handle.close().catch(() => {})
      return TOO_MANY
    }
    openDirs.add(handle)
    try {
      for await (const entry of handle) {
        if (deadlineHit) return TOO_MANY
        if (++seen > MAX_SCAN_ENTRIES) return TOO_MANY
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          if (GREP_SKIP_DIRS.has(entry.name)) continue
          if (roots.workspace.some((w) => isWithin(full, w, env))) continue
          const found = await walk(full, depth + 1)
          if (found) return found
        } else if (entry.isFile()) {
          const lower = entry.name.toLowerCase()
          if (
            isSecretFileName(entry.name) ||
            /\.keychain(-db)?$/u.test(lower) ||
            isCredentialNamed(full, roots, env)
          ) {
            return full
          }
        }
      }
    } finally {
      openDirs.delete(handle)
      handle.close().catch(() => {})
    }
    return null
  }

  const scan = async (): Promise<string | null> => {
    let isDir: boolean
    try {
      isDir = (await fsp.lstat(root)).isDirectory()
    } catch {
      return null
    }
    if (!isDir) return null
    try {
      return await walk(root, 0)
    } catch {
      // A read that failed midway (not an unopenable directory, which grep
      // cannot read either): what was left unread is unknown — fail closed.
      return UNREADABLE
    }
  }

  const scanPromise = scan()
  // An abandoned scan (the deadline won the race below) must never surface
  // as an unhandled rejection once it eventually settles.
  scanPromise.catch(() => {})

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<typeof TOO_MANY>((settle) => {
    timer = setTimeout(() => {
      deadlineHit = true
      settle(TOO_MANY)
    }, SCAN_DEADLINE_MS)
    timer.unref?.()
  })

  try {
    return await Promise.race([scanPromise, timeout])
  } finally {
    clearTimeout(timer)
    if (deadlineHit) {
      // The scan is still running in the background; close whatever it had
      // open at the moment the deadline won so a hung mount's handle does
      // not linger.
      for (const handle of openDirs) handle.close().catch(() => {})
    }
  }
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

async function matchPathTool(
  toolName: string,
  raw: string,
  roots: Roots,
  env: MatchEnv,
  workspaceDir: string | undefined
): Promise<SensitiveTarget | null> {
  const expanded = expandHome(raw.trim(), env.home)
  // A relative path lands where the process runs (what `fs` does); the
  // workspace is checked too, since that is where the model means it.
  const bases = isAbsolute(expanded)
    ? ['']
    : [env.cwd, ...(workspaceDir ? [workspaceDir] : [])]
  const hits: SensitiveTarget[] = []
  for (const base of bases) {
    const abs = base ? resolve(base, expanded) : resolve(expanded)
    const hit = await classifyPath(abs, roots, env, {
      recursive: toolName === TOOL_NAMES.grep
    })
    if (!hit) {
      // A grep reads every file under its root: a root outside the workspace
      // asks as `read_file` would when the tree holds a secret-named file.
      if (toolName === TOOL_NAMES.grep) {
        // A network root is never resolved (`PathResolver.real`) — realpath
        // can hang on the same unresponsive mount.
        const real = await roots.resolver.real(abs)
        const found =
          real === TIMED_OUT
            ? TOO_MANY
            : await findSecretInTree(real, roots, env)
        if (found) {
          const why =
            found === TOO_MANY
              ? 'too large to check'
              : found === NETWORK_VOLUME
                ? 'on a network or cloud volume, not scanned'
                : found === UNREADABLE
                  ? 'could not be read in full'
                  : display(found, env)
          const suffix =
            found === TOO_MANY ||
            found === NETWORK_VOLUME ||
            found === UNREADABLE
              ? why
              : `contains ${why}`
          hits.push({
            kind: 'ask',
            summary: `${display(abs, env)} (${suffix})`
          })
        }
      }
      continue
    }
    // A link is shown with what it points at — that is what gets read.
    const summary = hit.unchecked
      ? `${display(abs, env)} (not checked in time)`
      : hit.via === abs
        ? display(abs, env)
        : `${display(abs, env)} → ${display(hit.via, env)}`
    hits.push({ kind: hit.kind, summary })
  }
  return strongest(hits)
}

// ── terminal ─────────────────────────────────────────────────────────────────

/** Reading the macOS keychain from the shell. */
const KEYCHAIN_COMMAND =
  /\bsecurity\s+(?:find-[a-z-]*password|dump-keychain|export)\b/u

/** A CLI printing the token it has stored. */
const CREDENTIAL_COMMAND =
  /\b(?:gh\s+auth\s+token|gcloud\s+auth\s+(?:application-default\s+)?print-(?:access|identity)-token|aws\s+configure\s+(?:get|export-credentials)|az\s+account\s+get-access-token|op\s+(?:read|item\s+get)|git\s+credential\s+fill|vault\s+print\s+token|npm\s+token\s+list)\b/u

/**
 * Listing other processes with their arguments or environment: an MCP server
 * started as `… --api-key sk-…` shows the key to `ps -axo args`, and on Linux
 * `/proc/<pid>/environ` shows its environment. Any `ps` with an option (bare
 * `ps` lists only the shell's own terminal), `pgrep -a`/`-l`, `pstree -a`,
 * `lsof -p`, and `/proc/<pid>/cmdline` or `environ`. A documented heuristic, not a
 * list of every tool that can read a process table.
 */
const PROCESS_ARGS_COMMAND =
  /(?:^|[\s;|&(`/])(ps[ \t]+[^\s;|&)]\S*|pgrep\b[^;|&\n]*[ \t]-[a-z]*[al]\b|pstree\b[^;|&\n]*[ \t]-[a-z]*a|lsof\b[^;|&\n]*[ \t]-[a-z]*p)|(\/proc\/[^\s/]+\/(?:cmdline|environ))\b/iu

function processArgsTrigger(command: string): string | undefined {
  const m = PROCESS_ARGS_COMMAND.exec(command)
  return m ? (m[1] ?? m[2]) : undefined
}

/** A credential location named anywhere in a command, however it is spelled. */
const SECRET_MENTION =
  /(?:^|[\s'"=:(/`])(?:\.ssh|\.aws|\.gnupg|\.kube|\.netrc|\.docker\/config\.json|Library\/Keychains|\.npmrc|\.yarnrc\.yml|\.pypirc|\.git-credentials|\.vault-token|\.azure|\.password-store|\.mozilla|\.config\/(?:gh|gcloud|op|google-chrome|chromium|BraveSoftware|microsoft-edge)|\.cargo\/credentials[\w.-]*|\.terraform\.d\/credentials[\w.-]*|Library\/Cookies|Library\/Application(?:\\?[ \t]|%20)Support\/(?:Google\/Chrome|Chromium|BraveSoftware|Microsoft(?:\\?[ \t]|%20)Edge|Firefox|Arc))(?=$|[\s'"/;|&)<>`])/iu

const EXODUS_REFUSED_WORDS = 'lock\\.dat|tls|database|backups|analytics'
const REFUSED_MENTION = new RegExp(
  `\\.exodus\\/(?:${EXODUS_REFUSED_WORDS})(?=$|[\\s'"/;|&)<>\`*])`,
  'iu'
)
/** `cd ~/.exodus && cat lock.dat` — the directory and the file named apart. */
const EXODUS_MENTION = /\.exodus(?=$|[\s'"/;|&)<>`])/iu
const LOCK_OR_TLS_WORD = new RegExp(
  `(?:^|[\\s'"/])(?:${EXODUS_REFUSED_WORDS})(?=$|[\\s'"/;|&)<>\`*])`,
  'iu'
)

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

async function matchCommand(
  command: string,
  cwdArg: string | null,
  roots: Roots,
  env: MatchEnv,
  workspaceDir: string | undefined
): Promise<SensitiveTarget | null> {
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
  const candidates = tokens
    .filter((t) => t && !t.startsWith('-') && !t.includes('://'))
    .map((t) => resolve(cwd, expandHome(t, env.home)))
  // Resolved together (one shared deadline), judged in order.
  const hits = await Promise.all(
    candidates.map((abs) => classifyPath(abs, roots, env))
  )
  for (const [i, abs] of candidates.entries()) {
    const hit = hits[i]
    if (hit?.kind === 'refuse') {
      return {
        kind: 'refuse',
        summary: withTrigger(display(abs, env), command)
      }
    }
    // `tar c ~/.exodus`, `cp -r ~/.exodus …`: all of it holds the database.
    const wholeExodus =
      !hit && roots.exodusHome.some((r) => canon(abs, env) === canon(r, env))
    if ((hit || wholeExodus) && !pathTrigger) pathTrigger = display(abs, env)
  }

  const trigger =
    pathTrigger ??
    SECRET_MENTION.exec(command)?.[0].replace(/^[\s'"=:(/`]/u, '') ??
    KEYCHAIN_COMMAND.exec(command)?.[0] ??
    CREDENTIAL_COMMAND.exec(command)?.[0] ??
    processArgsTrigger(command) ??
    ((await classifyPath(cwd, roots, env)) ? display(cwd, env) : null)
  return trigger
    ? { kind: 'ask', summary: withTrigger(trigger, command) }
    : null
}

// ── call_mcp_tool ────────────────────────────────────────────────────────────

/** String leaves of `arguments` checked per call; more than this asks. */
const MAX_MCP_LEAVES = 500
const TOO_MANY_LEAVES = Symbol('too-many-leaves')

/** A URL (or `host:port`) at one of the ports Exodus's own API listens on. */
const OWN_API_PORT = new RegExp(
  `:(?:${SERVER_PORT}|${LAN_SERVER_PORT})(?!\\d)`,
  'u'
)

function stringLeaves(
  value: unknown,
  out: string[],
  depth = 0
): typeof TOO_MANY_LEAVES | void {
  if (typeof value === 'string') {
    if (value.trim() !== '') out.push(value)
    return out.length > MAX_MCP_LEAVES ? TOO_MANY_LEAVES : undefined
  }
  if (!value || typeof value !== 'object' || depth > 32) return undefined
  const children = Array.isArray(value) ? value : Object.values(value)
  for (const child of children) {
    if (stringLeaves(child, out, depth + 1) === TOO_MANY_LEAVES) {
      return TOO_MANY_LEAVES
    }
  }
  return undefined
}

/** A leaf as a filesystem path, when it reads as one (`/…`, `~…`, `file://…`). */
function leafAsPath(leaf: string, home: string): string | null {
  const trimmed = leaf.trim()
  if (/^file:\/\//iu.test(trimmed)) {
    try {
      return fileURLToPath(trimmed)
    } catch {
      return null
    }
  }
  const expanded = expandHome(trimmed, home)
  return isAbsolute(expanded) ? resolve(expanded) : null
}

/**
 * `call_mcp_tool`: an MCP server can read files, run commands or fetch URLs
 * the gate never sees. Every string leaf of `arguments` is checked — as a
 * whole path (a recursive read, since a server may walk a directory), with
 * the terminal heuristic (paths and credential commands inside it), and for a
 * URL at Exodus's own API ports, which is refused. The summary names the
 * server and tool, then what matched.
 */
async function matchMcpCall(
  args: unknown,
  roots: Roots,
  env: MatchEnv,
  workspaceDir: string | undefined
): Promise<SensitiveTarget | null> {
  const server = stringArg(args, 'server') ?? '?'
  const tool = stringArg(args, 'tool') ?? '?'
  const label = `${server}/${tool}`
  const inner =
    args && typeof args === 'object'
      ? (args as Record<string, unknown>).arguments
      : undefined
  const leaves: string[] = []
  if (stringLeaves(inner, leaves) === TOO_MANY_LEAVES) {
    return { kind: 'ask', summary: `${label}: too many arguments to check` }
  }
  const hits: SensitiveTarget[] = []
  for (const leaf of leaves) {
    if (OWN_API_PORT.test(leaf)) {
      return {
        kind: 'refuse',
        summary: `${label}: Exodus's own API — ${commandSummary(leaf)}`
      }
    }
    const path = leafAsPath(leaf, env.home)
    const pathHit = path
      ? await classifyPath(path, roots, env, { recursive: true })
      : null
    if (pathHit && path) {
      hits.push({
        kind: pathHit.kind,
        summary: `${label}: ${display(path, env)}`
      })
      continue
    }
    const hit = await matchCommand(leaf, null, roots, env, workspaceDir)
    if (hit) hits.push({ kind: hit.kind, summary: `${label}: ${hit.summary}` })
  }
  return strongest(hits)
}

/**
 * Whether a tool call touches a secret outside Exodus (`ask`), one of
 * Exodus's own that is never handed out (`refuse`), or neither (null).
 * `workspaceDir` is the chat's workspace: secret-named files inside it are
 * the model's own and pass. Pure apart from `realpath` on the paths it is
 * given; `env` is for tests.
 */
export async function sensitiveTarget(
  toolName: string,
  args: unknown,
  workspaceDir?: string,
  env: MatchEnv = defaultEnv()
): Promise<SensitiveTarget | null> {
  const isPathTool = toolName in PATH_TOOLS
  if (
    toolName !== TOOL_NAMES.callMcpTool &&
    toolName !== TOOL_NAMES.terminal &&
    !isPathTool
  ) {
    return null
  }
  const resolver = new PathResolver(env)
  try {
    const roots = await rootsOf(env, workspaceDir, resolver)
    if (toolName === TOOL_NAMES.callMcpTool) {
      return await matchMcpCall(args, roots, env, workspaceDir)
    }
    if (toolName === TOOL_NAMES.terminal) {
      const command = stringArg(args, 'command')
      if (!command) return null
      return await matchCommand(
        command,
        stringArg(args, 'cwd'),
        roots,
        env,
        workspaceDir
      )
    }
    const path = stringArg(args, PATH_TOOLS[toolName]!)
    if (!path) return null
    return await matchPathTool(toolName, path, roots, env, workspaceDir)
  } finally {
    resolver.dispose()
  }
}

/** What the model reads when the user (or the clock, or Stop) says no. */
export function declinedReason(summary: string): string {
  return `The user declined access to ${summary}.`
}

/** What a Philharmonic Group run reads: no one can approve there. */
export function groupRefusedReason(summary: string): string {
  return `Access to ${summary} is not available in a Group run.`
}

/** What the model reads for Exodus's own files (lock, TLS key, database,
 *  backups) and API. */
export function refusedReason(summary: string): string {
  return `Access to ${summary} is refused: it touches Exodus's own secrets, data files or API, which tools never reach.`
}
