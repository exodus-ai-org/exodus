# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Exodus is a cross-platform desktop AI chat application built with Electron, React, and Node.js. The toolchain is electron-forge + Vite (via `@electron-forge/plugin-vite`) + bun, with a `packages/shared` workspace package (`@exodus/shared`). It features multi-provider LLM support, a knowledge base (RAG), Deep Research, Philharmonic (multi-agent Groups), MCP (Model Context Protocol) routes, an app lock, lossless context management (LCM), and a memory/personalization layer.

## Project Constraints (read first)

These rules are mandatory. Some are automated (noted); the rest are conventions
you must uphold.

- **Tests + checkpoints with UI.** When adding a key interactive element, add a
  `TEST_IDS` entry (`packages/shared/src/constants/test-ids.ts`) + `data-testid`, and
  reference it from a Playwright test. Test ids are a durable contract — never
  rename or regenerate an existing id. _Enforced by `test-ids.linkage.test.ts`._
- **Pre-commit gate.** Before committing, `bun run fmt` → `bun run lint` →
  `bun run typecheck` → `bun run i18n:check` → `bun run test` must pass. _Enforced by
  the husky pre-commit hook._ Do not `--no-verify` except for one known,
  standing cause: a flaky PGlite WASM teardown (`RuntimeError: Aborted()`
  during an `invoke_viiiiii`/wasm abort in `@electric-sql/pglite`) under
  the parallel-worker test isolation — a race in PGlite's WASM teardown,
  not a bug in one specific test file. It has surfaced attributed to
  `src/main/lib/ai/context-management/index.test.ts` and to
  `src/main/lib/jobs/worker.test.ts` on different runs of an unrelated,
  passing (785/785) suite — before invoking `--no-verify` for this,
  confirm all tests actually passed and the only failure is this
  unhandled-rejection-during-teardown pattern, then retry `bun run test`
  once (it's intermittent and often passes clean on a second run) before
  reaching for `--no-verify`. (A second, long-standing exception — an
  orphan `TEST_IDS.providerModels.modelSelect` id — was resolved
  2026-09-18 when `model-picker.tsx`'s i18n pass applied the id to its
  `ComboboxInput`, satisfying the linkage test the Playwright spec had
  been waiting on since before this id existed.)
- **Reuse UI primitives.** Prefer existing `@/components/ui` (shadcn) components
  over hand-rolled equivalents (e.g. shadcn `Select`, `InputOTP`).
- **Copy language.** New user-facing strings are keys in
  `packages/shared/src/i18n/locales/en/<namespace>.json`, rendered via `t()` /
  `<Trans>` (renderer) or `mainI18n.t()` (main) — never hardcoded literals.
  English is the source catalog. `bun run i18n:check` gates catalog parity.
- **Keep this file current.** Any change to architecture, routes, or directory
  structure updates CLAUDE.md in the same change. _Partly enforced by
  `claude-md-freshness.test.ts` (paths) and `claude-md-staleness.test.ts`
  (retired claims)._
- **Models & providers.** Use the shared `resolveModel()`
  (`src/main/lib/ai/providers/resolve-model.ts`); model selection is now
  live-fetched per provider from Settings.

## Development Commands

### Running the Application

```bash
bun run start              # Start the dev build via electron-forge (Vite dev servers, hot reload)
```

### Building

```bash
bun run package          # Package the app for the current platform into out/ (keeps data-testid markers — e2e needs them)
bun run make             # Build installers/archives (Squirrel, ZIP, DMG, deb, rpm); strips data-testid (STRIP_TEST_IDS=1)
bun run publish          # Publish a release to GitHub (needs GITHUB_TOKEN)
bun run build:helper     # Rebuild the macOS Swift computer-use helper into resources/bin/exodus-input
```

### Code Quality

```bash
bun run typecheck        # Run TypeScript checks for node (main + preload), web (renderer) and the shared package
bun run typecheck:node   # Check main process + preload code only
bun run typecheck:web    # Check renderer process code only
bun run typecheck:shared # Check packages/shared only
bun run lint             # Run oxlint (replaces ESLint, ~50-100x faster)
bun run lint:fix         # Run oxlint with auto-fix
bun run fmt           # Format all files with oxfmt (replaces Prettier, ~30x faster)
bun run fmt:check     # Check formatting without modifying files
```

### Testing

```bash
bun run test             # Run all unit tests with Vitest
bun run test:watch       # Run tests in watch mode
bun run test:coverage    # Run tests with V8 coverage report
bun run test:e2e:electron  # Playwright Electron E2E (packages first: it drives the production build in .vite/; the app boots pi's scripted provider — EXODUS_FAUX_PROVIDER=1 from the fixture — so chat specs need no key)
bun run test:e2e:api       # Playwright API integration (needs a running app + .env.test)
bun run test:e2e:providers # Provider compatibility (needs API keys in .env.test)
```

### Database

```bash
bun run db:generate      # Generate Drizzle migrations from schema
```

### Other

```bash
bun run i18n:check       # Verify catalog parity across all locales (also runs in the pre-commit gate)
bun run i18n:status      # Print the translation-review status board per locale
```

## Architecture

### Electron Process Model

Exodus uses a three-process architecture:

1. **Main Process** (`src/main/main.ts`):
   - Manages Electron app lifecycle, window creation, and IPC
   - Runs Hono HTTP server on `localhost:60223` (constant `SERVER_PORT` in `packages/shared/src/constants/systems.ts`)
   - Initializes PGlite database with pgvector extension
   - MCP server connection is archived (commented out in `app.ts`); an `/api/v1/mcp` route + settings remain
   - Handles auto-updates via `update-electron-app` (`src/main/lib/auto-updater.ts`, which keeps the state machine the renderer's update panel speaks)

2. **Renderer Process** (`src/renderer/`):
   - React 19 application with React Router v7
   - Communicates with main process via HTTP (localhost:60223)
   - Uses Jotai for global state management
   - SWR for server state fetching
   - Entry points: main app plus the sub-apps searchbar, quick-chat, artifacts

3. **Preload Process** (`src/preload/preload.ts`):
   - Provides secure bridge between renderer and Electron APIs
   - Context isolation + sandbox enabled
   - Exposes `window.electron` (`ipcRenderer.{send,invoke,on,once,removeListener,removeAllListeners}` + `process.{platform,versions}` — deliberately not `process.env` — the same nested shape as `@electron-toolkit/preload`'s `electronAPI`, reimplemented without the dependency) and `window.api` (`os`, `locale`)

### Data directory, ports and isolation

Exodus is the successor of the older `universal-client` app and shares its
`~/.exodus` layout, so a dev build sees the same chats, settings and memories:

- **Data dir**: `~/.exodus` for packaged _and_ unpackaged runs (`bun run start`,
  `electron .`) — `getExodusHome()` in `src/main/lib/paths.ts`; startup logs the
  directory in use (`Data directory`); `~/.exodus/analytics` holds the DuckDB
  chat-audit snapshot. **PGlite is single-process: never run two
  Exodus processes (a dev build, the packaged app, universal-client) against it
  at the same time** — the database can be corrupted (backups live in
  `~/.exodus/backups`). Between Exodus builds this is enforced:
  `src/main/lib/single-instance.ts` takes Electron's single-instance lock from
  `db/db.ts`, before PGlite is constructed (dev and packaged share `userData`,
  so they share the lock); a second launch exits and the running app raises its
  window, or — if the holder is quitting — waits for it. universal-client has
  its own `userData` and is not covered. `EXODUS_HOME` points a run at another directory.
- **Electron `userData`**: the default `~/Library/Application Support/Exodus`
  for every build — it only holds Chromium state (localStorage, caches) and is
  where the legacy-location migration looks. There is no `-dev` variant of
  anything.
- **Server ports** (`packages/shared/src/constants/systems.ts`): `SERVER_PORT =
60223` is plaintext HTTP bound to loopback only (`127.0.0.1` and `::1`) — the
  renderer, exodus-cli, `tests/api` and the iOS Simulator; nothing on the LAN
  can reach it. `LAN_SERVER_PORT = 60224` is what `exodus-ios` on a device
  connects to. Don't change either without updating the clients.
- **E2E**: `playwright.config.ts` points `$HOME` at a scratch dir
  (`<tmpdir>/exodus-e2e-home`); the electron fixture wipes `~/.exodus` under it
  before every test and throws at import unless `$HOME` is that dir. It also
  refuses to launch while anything answers on `localhost:60223`: the renderer
  always talks to that port, so a running dev build (`bun run start`) would be
  driven by the suite instead of the app under test — reading and writing the
  real `~/.exodus` through it. To test a
  packaged build by hand, sandbox `$HOME` and pass `--user-data-dir` the same way.

### Skills (skills.sh)

Agent Skills come from **skills.sh** (the ClawHub marketplace was dropped for
quality reasons). `src/main/lib/ai/skills/`:

- `skills-sh-client.ts` — list / search / detail / audit against the BFF relay
  `SKILLS_SH_BFF_URL` (`https://skills-md.yancey.app`, the same relay
  `exodus-cli` uses; `EXODUS_SKILLS_BFF_URL` overrides it).
- `skills-store.ts` — installs a skill's `files[]` under
  `~/.exodus/skills/<slug>/` and records it in `~/.exodus/skills/.lock.json`
  (files first, lockfile last; paths that escape the slug dir are refused).
  Same directory and lockfile shape as `exodus-cli`, so skills installed by
  either are visible to both.
- `skills-manager.ts` — the seam chat + Philharmonic consume:
  `listInstalledSkills()`; for chat, `getActiveSkillsIndex()` — one line per
  active skill (slug, the SKILL.md frontmatter `description` folded onto one
  line, the absolute path of its SKILL.md) that the system prompt carries in
  `<skills>`, so the model reads a skill's body with `read_file` only when a
  task matches (the Agent Skills spec's own model; constant prompt cost);
  for Philharmonic, `getSkillsContentBySlugs()` / `getActiveSkillsContent()`
  (full bodies, frontmatter stripped, `$SKILL_DIR` baked to the install path,
  wrapped in `<active_skills>`).

Route `/api/v1/skills` (`src/main/lib/server/routes/skills.ts`): `GET
/registry?view&page&per_page`, `GET /search?q`, `GET /curated` (the registry's
publishers, each with every skill it maintains — ~2 MB, no parameters), `GET
/detail?id`, `GET /audit?id` (`null` when unaudited), `GET /installed`, `POST
/install {id}`, `DELETE /:slug`, `PATCH /:slug/toggle`. Skill ids are
`owner/repo/slug`, hence query params. UI: Settings → Skills Market
(`src/renderer/components/skills-market/`), built from the Settings kit like
every other page (one-line list rows — rank, name, source, an "Installed"
badge, installs on the right; no icon tiles, no mono outside commands and file
paths): Discover (search; All time / Trending / Hot leaderboards, same-repo
rows collapsed behind "+N more"; Curated — `curated.tsx`, publishers sorted by
installs, each opening to its skills with the registry's featured pick
badged) → detail page (security audit card, the copyable `exodus skills
install <id>` command, README card, bundled files) → install / toggle /
uninstall; an Installed tab. The page header is one short band: the intro on
the left and, on the right, a compact terminal block for `exodus-cli`
(`cli-notice.tsx`: package-manager tabs + two copyable commands, built from the
same `CommandLine` the detail page uses); it stacks in a narrow window. Spec:
`docs/superpowers/specs/2026-09-19-skills-sh-market-design.md`.

### Chat Audit (DuckDB)

Settings → Developer → Chat Audit is a read-only SQL console over a DuckDB
snapshot of the user's data (`src/main/lib/analytics/`, route
`/api/v1/analytics`, page `settings-form/chat-audit.tsx`). `snapshot.ts`
copies `chat` / `message` / `project` out of PGlite via NDJSON into
`~/.exodus/analytics/exodus.duckdb` (usage flattened to `*_tokens` /
`cost_usd` columns, `content` kept as JSON) and adds a `logs` view straight
over `~/.exodus/logs/*.jsonl`; `duckdb.ts` lazy-`import()`s
`@duckdb/node-api` on first use (never at boot), opens the file
`READ_ONLY` for queries and `READ_WRITE` only while rebuilding, serialised
on one promise chain, and caps results at 500 rows. The editor is Monaco
(`settings-form/chat-audit-editor.tsx`, SQL language, ⌘↩ bound via the editor,
completions from `packages/shared/src/constants/chat-audit-schema.ts`, which
is also what `snapshot.ts` builds the tables from). Presets live in
`packages/shared/src/constants/chat-audit-presets.ts` and every one is
executed against a fixture snapshot in
`tests/unit/main/lib/analytics/snapshot.test.ts`. PGlite stays the only
write path. Packaging: the package is a Vite external and forge keeps
`node_modules/@duckdb/**` + `detect-libc` and unpacks `@duckdb/**` from
asar (the `.node` dlopens `libduckdb` beside itself). Research notes:
`docs/duckdb-research.md`; spec:
`docs/superpowers/specs/2026-09-19-duckdb-chat-audit-design.md`.

### Colour tone

Settings → General → Color tone (`generals.tsx`) persists `settings.colorTone`
(`ColorToneSchema`: neutral | emerald | blue | violet | rose | orange | yellow;
a `text` column defaulting to `neutral`). The value becomes `data-tone` on
`<html>`, and `globals.css` carries one `[data-tone='…']` /
`.dark[data-tone='…']` token block per tone (neutral is the base
`:root` / `.dark`). `src/renderer/lib/tone.ts` applies the attribute and
mirrors it to localStorage (`exodus-color-tone`) so every entry (`main.tsx`

- the three sub-apps) can call `bootTone()` before React mounts (no flash);
  `components/tone-bridge.tsx` follows `useSettings()` in the main window and
  sub-apps follow via the `storage` event. The light/dark/system mode stays in
  next-themes' `vite-ui-theme` key.

### Migration status

`docs/migration-plan.md` records how the business code was ported from
universal-client and every place it deliberately diverges (React Compiler left
off, seven oxlint style rules downgraded to warnings, auto-updater state machine
rebuilt on `update-electron-app`, …). Read it before changing build/packaging code.

### Backend Server Architecture

The main process runs a **Hono HTTP server** that handles all business logic:

**Server Routes** (`src/main/lib/server/routes/`, registered in `src/main/lib/server/app.ts`):

Every business endpoint is mounted on one versioned sub-app (`app.route('/api/v1', v1)`), so the public paths are `/api/v1/<route>`; the lock/trace/settings middlewares still match `/api/*`. A breaking API change ships as a new `/api/v2` sub-app beside v1 rather than mutating v1 in place. Any client of this backend (the renderer, `tests/api`, `exodus-ios`) must address `/api/v1/...`.

`/api/v1/chat`, `/api/v1/lcm`, `/api/v1/history`, `/api/v1/knowledge-base`, `/api/v1/project`, `/api/v1/settings`, `/api/v1/skills`, `/api/v1/audio`, `/api/v1/db-io`, `/api/v1/deep-research`, `/api/v1/discover`, `/api/v1/tools`, `/api/v1/philharmonic`, `/api/v1/s3`, `/api/v1/mcp`, `/api/v1/memory`, `/api/v1/usage`, `/api/v1/logs`, `/api/v1/backup`, `/api/v1/artifacts`, `/api/v1/computer-use`, `/api/v1/analytics`, `/api/v1/pair`, `/api/v1/devices`, `/api/v1/lock` (mounted directly on `app`, ahead of the lock gate — see App Lock).

The `/api/v1/settings` route includes `POST /api/v1/settings/models` — dispatches to the appropriate list-models handler based on the provider in the request body, reading the API key from the request (not from saved settings) to fetch live model catalogs.

**Middleware Pipeline** (order in `app.ts`):

1. Origin gate (`createOriginGate`) — a request must carry no `Origin` (exodus-ios, exodus-cli, `tests/api`, and the packaged renderer: a `file://` page in Electron sends none) or, in a dev build only, exactly the Vite renderer's; anything else — a website, another loopback port, `null`, an extension, the artifact sandbox — gets `403`, as does a request on the loopback listener addressed by a public `Host` (DNS rebinding). Runs before CORS so a refused origin gets no `Access-Control-Allow-Origin`. Which listener took a request is in the bindings (`listenerOf(c)` in `server/types.ts`)
2. CORS middleware (`hono/cors`)
3. Auth gate (`authGate`) — on the LAN listener a request needs `Authorization: Bearer <token>` of a paired device (`401` otherwise), except `POST /api/v1/pair`, which the pairing window guards; `/api/v1/devices*` is refused there outright (`403`). Loopback passes straight through. Ahead of the lock gate so an unauthenticated request learns nothing, not even that the app is locked
4. Lock gate (`lockGate`) — rejects all `/api/*` with `423` while the app is locked. `POST /api/v1/lock/unlock` is mounted just before it (after `authGate`), so a paired device can unlock the app from the phone
5. Trace gate (`traceMiddleware`) — wraps each `/api/*` request in an `AsyncLocalStorage` trace (see `src/main/lib/logger/`), sets the `x-trace-id` response header
6. Settings injection — `getSettings()` set on the Hono context per request (served from a cache in `db/queries.ts` that `updateSettings` / `updateSettingField` invalidate — write the `settings` table only through those two)
7. Error handler (`app.onError`, returns JSON errors)

The MCP-tools middleware (injecting MCP tools into context) is **archived** (commented out in `app.ts`).

### Database Layer

**Database**: PGlite (embedded Postgres) with pgvector extension

- Location: `~/.exodus/database` (`getDatabaseDir` in `src/main/lib/paths.ts`)
- ORM: Drizzle ORM with Zod schemas
- Schema: `src/main/lib/db/schema.ts`
- Migrations: `resources/drizzle/`

**Key Tables**:

- `settings` - Global settings (models, API keys, preferences, `colorTone`)
- `knowledge_doc` - Knowledge base source documents + per-doc LightRAG sync status
- `deep_research` / `deep_research_message` - Deep research jobs and progress updates
- `memory` / `memory_usage_log` - User memory and audit trail
- `session_summary` - Summarized conversation context
- `project` - Projects
- `mcp_server` - Configured MCP servers
- `paired_device` - Devices allowed onto the LAN listener: a name and the SHA-256 of
  the device's token, never the token. Machine-local — deliberately not part of
  `db-io` export/import or of a data reset
- `lcm_summary` - Lossless context-management summaries
- `message.runId` - the run a row belongs to: the id of the run's user message
  (backfilled by migration 0008 by walking each chat in `createdAt` order; a
  row with no user row before it is a run of its own). `runId` is on every
  `ChatMessage` on the wire too
- Philharmonic: `agent`, `agent_memory`, `team`, `task`, `task_execution`, `task_execution_event`, `conversation_plan`, `plan_step`

The full chat/message tables and indexes are defined in `src/main/lib/db/schema.ts`.

### AI/LLM Integration

**Multi-Provider Support** (built on `@earendil-works/pi-ai` + `@earendil-works/pi-agent-core` 0.85):
pi 0.85 has no global registry: every request is routed by `model.provider`
to a provider registered on a `Models` collection, and the process's one
collection is `getKernelModels()` in `src/main/lib/ai/kernel/models.ts` —
the five built-in providers through pi's factories, plus Ollama as a dynamic
provider `ollama` (empty catalog; `providers/ollama.ts` hand-builds the model
per request with `provider: 'ollama'`). `streamFn` from the same file is what
every `Agent` / `agentLoop` streams through; the API key from Settings is
passed explicitly per request and wins over anything a provider would
resolve from the environment. The `/compat` entrypoint is not used.

Model resolution lives in `src/main/lib/ai/providers/`. The catalog-backed
providers (OpenAI GPT, Azure OpenAI, Anthropic Claude, Google Gemini, xAI Grok)
are one `SPECS` table + a `fromSpec` factory in `index.ts` — a row only supplies
the base-URL setting, its fallback, the default model ids, and the pi-ai
`provider` / `api` strings (xAI is `openai-responses`: pi 0.85's xai provider
serves the Responses API only). Every path resolves through the shared
`resolveModel()` in `resolve-model.ts` (do not duplicate model-resolution
logic); it looks the id up in the collection's catalog and accepts an
optional live-fetched `snapshot` parameter (from `POST /api/v1/settings/models`)
to override it. Per-provider fallback defaults (contextWindow, cost) and
`MODEL_METADATA_FALLBACK` (narrower scope: only what a provider's own list API
omits) live there. Live model lists are fetched per-provider from
`src/main/lib/ai/providers/list-models/`.

**Chat kernel** (`src/main/lib/ai/kernel/`, spec
`docs/superpowers/specs/2026-09-22-chat-kernel-design.md`):

A **run** is one user message through the final answer, with every model
step and tool result in between; `message.runId` (the user message's own id,
on every row of the run) is the unit that context assembly, compaction and
rendering work in.

- `models.ts` — the `Models` collection and `streamFn` (above)
- `run.ts` — `runAgent(input): AsyncIterable<KernelEvent>` wraps pi's `Agent`
  (`convertToLlm` asserts the run invariant, `beforeToolCall` blocks tools
  disabled in settings) and yields the kernel's own events, each stamped with
  `runId`: `message_update` · `message_end` · `tool_start` · `tool_update` ·
  `tool_end` · `run_end` (always, with the messages that completed) · `error`
  (after `run_end`, when a provider failed). Stop aborts the agent; a partial
  answer is kept, marked `aborted`
- `record.ts` — `RunRecorder`: fed every event, `persist()` from the route's
  `finally` saves the run's rows with its duration and enqueues the post-run
  jobs
- `invariant.ts` — `dropBrokenRuns()`: a provider request starts with a user
  message and every tool result follows its tool call; a violating run is
  dropped and logged, never sent (the 2026-09-21 `unexpected tool_use_id` 400)
- `events.ts` — the `KernelEvent` union; `faux.ts` / `faux-boot.ts` — pi's
  scripted provider for tests (see Testing)

**Chat Flow** (`src/main/lib/server/routes/chat.ts`):

1. Retrieve user settings (model selection, API keys)
2. Assemble the context (LCM, in whole runs) and bind built-in tools based on
   the `AdvancedTools` selection and `settings.tools.disabledTools`
3. `for await` over `runAgent()`, mapping each kernel event onto one SSE
   event through `createSseWriter` (`routes/chat-sse.ts`): streaming
   `message_update` snapshots are coalesced to one per
   `STREAM_FLUSH_INTERVAL_MS` (each carries the whole message so far), other
   events flush first so order holds, and writes become no-ops once the
   client has gone. Wire shapes are unchanged; every message carries `runId`
4. However the run ends — done, a provider error midway, or Stop (which
   cancels the response stream) — `RunRecorder.persist()` saves the messages
   that completed and enqueues background jobs (LCM compaction, memory
   consolidation, and search indexing only when Elasticsearch is configured)
   onto the pgmq-backed job queue (`src/main/lib/jobs/`) rather than running
   them inline

**Tool Architecture** (`src/main/lib/ai/calling-tools/`):
Each tool has a description for LLM understanding, a TypeBox parameter schema, and an execute function.

Built-in tools (files in `src/main/lib/ai/calling-tools/`), named in
snake_case on the wire — the names are `TOOL_NAMES` in
`packages/shared/src/constants/tool-names.ts`, the single source of truth for
the tool definitions, the binder, the system prompt, the renderer's dispatch
and the settings registry (migration 0007 rewrote stored rows from the old
camelCase; `toToolName()` maps a pre-rename `disabledTools` key):

`computer_use`, `create_artifact`, `deep_research`, `edit_file`, `find_files`, `grep`, `image_generation`, `lcm_describe`, `lcm_expand`, `lcm_grep`, `list_directory`, `map_itinerary`, `read_file`, `search_knowledge_base`, `terminal`, `weather`, `web_fetch`, `web_search`, `write_file`.

**MCP toolbox** (`calling-tools/mcp-toolbox.ts`): MCP servers are not bound
tool by tool (providers cap the tools array — OpenAI at 128 — and one server
can exceed it alone). Two tools stand in for all of them: `list_mcp_tools({
server?, query? })` returns each tool's server, name, description and
parameter schema; `call_mcp_tool({ server, tool, arguments })` forwards the
call and returns the result unchanged; the prompt's `<mcp_servers>` block
carries one line per connected server so the model knows what exists.

**System prompt** (`src/main/lib/ai/prompts.ts`, `getSystemPrompt({
mcpDirectory, workspaceDir, skillsIndex })`): the policy is autonomy — use
tools without asking or announcing, chain calls until the task is done, stop
only for a real ambiguity or a `<hard_stops>` item (deleting/overwriting
outside the workspace, `sudo`, system-wide installs, `git push`, anything sent
or paid on the user's behalf). Every built-in is explained by its wire name
(`tests/unit/main/lib/ai/prompts.test.ts` holds that — a new tool must be
added there), grouped research / files & shell / output / memory / computer;
HTML and anything visual goes through `create_artifact`. `<workspace>`,
`<skills>` and `<mcp_servers>` render only when given; citations live under
`<citation_rules>`.

**Chat workspace**: `getChatWorkspaceDir(chatId)` = `~/.exodus/workspace/<chatId>`
(`paths.ts`; not created until used). `terminal(defaultCwd)` and
`findFiles(defaultRoot)` are factories, bound to the workspace when
`bindCallingTools` gets a `chatId` and to the user's home otherwise
(Philharmonic keeps `~/.exodus/groups/<id>` as its own).

### Knowledge Base (LightRAG)

The knowledge base is backed by an **optional, self-hosted LightRAG server** the user runs (Exodus is a client only — see `docs/lightrag-setup.md`). `knowledge_doc` rows are the editable source-of-truth (Settings → Knowledge Base); the `kb-sync` job (`src/main/lib/jobs/handlers.ts`) pushes them into LightRAG via `src/main/lib/knowledge-base/lightrag-client.ts` (delete + re-insert on edit), and `reconcile.ts` on the jobs cron settles each row's `indexStatus` via LightRAG's `track_status`. `resolveKnowledgeBase(settings)` (never throws) gates the `searchKnowledgeBase` tool, bound by `bindCallingTools` for the main chat and every Philharmonic employee loop. Retrieval is context-only (`only_need_context: true`) — Exodus's own model writes the answer. No scoping: one shared KB.

### Deep Research

**Architecture** (`src/main/lib/ai/deep-research/`):

Multi-level recursive research with real-time progress streaming:

1. **Query Generation** (`generate-queries.ts`):
   - AI generates search queries based on topic
   - Configurable breadth (default: 4 queries per level)

2. **Search Execution** (`deep-research.ts`):
   - Executes Serper API searches recursively
   - Depth parameter controls recursion levels (default: 2)
   - Processes results and extracts learnings

3. **Result Processing** (`process-search-results.ts`):
   - Extracts key insights from search results
   - Identifies web sources with titles and URLs
   - Determines next research directions

4. **Report Generation** (`final-report.ts`):
   - Compiles all findings into structured Markdown report
   - Includes source citations
   - Stored in database for later retrieval

5. **Progress Streaming** (`src/main/lib/server/routes/deep-research.ts`):
   - SSE connection for real-time updates
   - Status: `streaming` → `completed` or `failed`
   - Frontend polls for progress messages

### MCP (Model Context Protocol)

**Integration** (`src/main/lib/ai/mcp.ts`):

> Note: automatic MCP server connection at startup is **archived** (`connectMcpServers()` is commented out in `app.ts`). The `/api/v1/mcp` route and MCP settings remain. The flow below describes the intended/legacy behavior.

Allows external tools/servers to be integrated via MCP protocol:

1. **Configuration**: Users define MCP servers in settings JSON:

```json
{
  "mcpServers": {
    "git": { "command": "git-mcp", "args": [] },
    "filesystem": { "command": "fs-server", "args": [] }
  }
}
```

2. **Connection** (`connectMcpServers()`):
   - Launches each server via StdIO transport
   - Retrieves available tools from each server
   - Stores tools in Hono context

3. **Tool Execution**:
   - MCP tools merged with built-in tools
   - AI can call MCP tools during conversation
   - Results returned via standard MCP protocol

**Key Dependencies**:

- `@ai-sdk/mcp` - MCP client
- `@modelcontextprotocol/sdk` - MCP protocol implementation

### Memory & Personalization Layer

**Memory System** (`src/main/lib/ai/memory/manager.ts`):

A durable, topic-consolidated memory of the user. Key functions:
`runMemoryConsolidation()`, `loadRelevantMemories()`, `formatMemoriesForSystem()`.

**Memory entries** (one row per topic/person in the `memory` table):

- `section` - `profile` (durable identity / setup / hard constraints / stable
  preferences) | `topic` (an interest, project, recurring subject) | `person`
- `key` - short stable title (e.g. "Classical Music")
- `summary` - one sentence; `details` - `string[]` of bullets

**Memory Operations** (all in `src/main/lib/ai/memory/manager.ts`):

1. **Consolidation** (`runMemoryConsolidation()`) — `memory-consolidate` job
   after each turn when `memory.autoCapture`. One LLM call sees the
   conversation + the existing memory index and returns `create`/`update`
   operations. Prefers updating an existing entry (returning its full revised
   summary + details) over inserting a duplicate.

2. **Read filter** (`loadRelevantMemories()` / `formatMemoriesForSystem()`) —
   pre-turn when `memory.useInChat`. One LLM call picks the relevant
   entries; selected entries are recorded in `memory_usage_log` and get
   `lastUsedAt` bumped, then rendered into a `<user_memory>` system block.

### Philharmonic (multi-agent Groups)

Philharmonic runs multi-agent "Groups" (teams of agents collaborating on tasks).

- Main process: `src/main/lib/ai/philharmonic/` (employee loop, execution engine, agent memory/tools, knowledge-base tools)
- Renderer: `src/renderer/components/philharmonic/`
- Route: `/api/v1/philharmonic`
- Each Group gets an isolated workspace under `~/.exodus/groups`
- Scheduled tasks (`task.cronExpression` for recurring, `task.runAt` for
  one-off) run via `src/main/lib/ai/philharmonic/scheduler.ts`
  (per-task `node-cron` jobs + a once-a-minute sweep for one-off tasks);
  managed from the Schedule tab on the Dashboard page
  (`components/philharmonic/schedule/`)

### App Lock

A local PIN lock protects the app and gates all API access.

- Main process: `src/main/lib/lock/` (`lock-manager` state machine, `pin-store` using scrypt + Electron `safeStorage`, `idle-watcher`, `lock-config`, IPC handlers)
- The `lockGate` middleware rejects every `/api/*` request with `423` while locked (`/api/v1/lock/unlock` excepted, below)
- Unlock is IPC (the lock screen: PIN, or the Mac's Touch ID) or `POST
/api/v1/lock/unlock` (`routes/lock.ts`), the one API route mounted ahead of
  `lockGate`. It reads no PIN: a paired device's own biometric (Face ID on
  the phone) stands in for it, the way Touch ID does locally — the trust is
  in holding a device token. `authGate` still runs first, so on the LAN only
  a paired device reaches it; on loopback any local process can, which the
  threat model already trusts (it can read `~/.exodus`)
- The encrypted PIN secret lives at `~/.exodus/lock.dat`
- Renderer: `src/renderer/components/lock/`

### LCM (lossless context management)

Compacts long conversations without losing information, surfacing summaries the agent can expand or grep.

- Main process: `src/main/lib/ai/context-management/` (compaction, context assembler, token counter, status bus)
- Route: `/api/v1/lcm`
- Related built-in tools: `lcm_describe`, `lcm_expand`, `lcm_grep`
- **The run is the atom.** `assembleContext(chatId, budget, freshTailRuns)`
  groups context items by `message.runId` (`groupItemsIntoRuns`): the fresh
  tail is the most recent N runs, whole; back-fill adds whole older runs,
  newest first, and stops at the first that does not fit; leaf compaction
  chunks on run boundaries. So a request starts with a user message and every
  tool result follows its tool call — a 40-seed property test on a real PGlite
  (`context-assembler.property.test.ts`) holds it. `memory.freshTailSize`
  counts runs (default 6, range 2–24; `freshTailRuns()` clamps a value saved
  when it counted messages). Philharmonic's own LCM keeps a fixed 16-message
  tail

### Sub-apps

Separate renderer entry points under `src/renderer/sub-apps/`: `searchbar`, `quick-chat`, `artifacts`.

### Frontend Structure

**Stack**:

- React 19 with TypeScript
- React Router v7 for navigation
- Jotai for global state management (atoms in `src/renderer/stores/`)
- SWR for server state fetching
- Tailwind CSS + Radix UI components
- @tiptap for rich text editing (Immersive Editor)
- Monaco Editor for code display
- Three.js for 3D visualizations

**Key Directories**:

- `components/` - Reusable UI components (including shadcn/ui)
- `services/` - API call wrappers (chat, RAG, settings, etc.)
- `stores/` - Jotai atoms for global state
- `hooks/` - Custom React hooks
- `layouts/` - Page layouts (workspace, chat)
- `routes/` - Route definitions
- `containers/` - Page-level components
- `sub-apps/` - Special entry points (searchbar, quick-chat)

**API Communication**:

- All API calls via `fetcher()` utility to `http://localhost:60223/api/*`
- Streaming responses are consumed from the server's `runAgent()`-driven SSE stream (`lib/stream-manager.ts`)
- SWR for caching and revalidation

### Path Aliases

**Main Process** (`tsconfig.node.json`): no aliases — relative imports, plus the
`@exodus/shared/*` workspace package. Main-process code imports DB row types
straight from `src/main/lib/db/schema.ts` (the shared package must not import the app).

**Renderer Process** (`tsconfig.web.json`):

- `@` → `src/renderer`
- `@exodus/shared/*` → the `packages/shared` workspace package (subpath exports, see its `package.json`)
- DB row types come from `@/types/db` (a renderer-side passthrough of `src/main/lib/db/schema.ts`)

**Shared Code** (`packages/shared/src/`, imported as `@exodus/shared/...`):

- `types/` - Shared TypeScript types
- `constants/` - Constants used across processes
- `utils/` - Utility functions
- `schemas/` - Zod schemas
- `errors/` - Custom error classes

## Important Implementation Notes

### When Working with AI Providers

- Providers resolve a `Model` (from `@earendil-works/pi-ai`) via the shared `resolveModel()` in `src/main/lib/ai/providers/resolve-model.ts` — do NOT duplicate model resolution logic
- `resolveModel()` accepts an optional `snapshot` parameter (live-fetched from `POST /api/v1/settings/models`) to override the pi-ai registry
- Per-provider fallback defaults (contextWindow, cost) and `MODEL_METADATA_FALLBACK` are centralized in `resolve-model.ts`
- Model lists are now live-fetched per provider from Settings via `src/main/lib/ai/providers/list-models/`
- Model names/API keys are retrieved from settings (never hardcode)
- One-shot completions go through `completeSimple` from `src/main/lib/ai/utils/complete.ts` (see Shared Utilities) — pi-ai does not throw on a failed request
- `@earendil-works/pi-ai` / `pi-agent-core` 0.85: there is no global `stream`/`complete`/`getModel` — everything goes through `getKernelModels()` (`src/main/lib/ai/kernel/models.ts`); `completeSimple` still comes from `src/main/lib/ai/utils/complete.ts`; the `/compat` entrypoint is not used. `ThinkingLevel` has `max` and no `off` (the app's `off` means no reasoning option). History: `docs/pi-ai-review.md`

### When Working with Database

- Always use Drizzle ORM queries (`src/main/lib/db/queries.ts`)
- Schema changes require running `bun run db:generate` to create migrations
- Vector searches use `cosineDistance()` from pgvector
- All timestamps use `timestamp('created_at').notNull().defaultNow()`

### When Working with Tools

- Tool definitions go in `src/main/lib/ai/calling-tools/`; the `name` is a
  `TOOL_NAMES` entry (`packages/shared/src/constants/tool-names.ts`), added
  there first — snake_case, and never renamed once rows carry it
- Tools are bound conditionally based on the `AdvancedTools` selection and
  `settings.tools.disabledTools`; a call to a disabled tool is also blocked in
  the kernel's `beforeToolCall`
- Parameters are TypeBox schemas (`Type` from `@earendil-works/pi-ai`)
- Enum parameters use pi-ai's `StringEnum([...] as const)`, never
  `Type.Union([Type.Literal(...)])` — that emits `anyOf`/`const`, which
  Google's function-calling schema rejects
- Tool descriptions are critical for LLM understanding
- Return structured data that the LLM can interpret

### When Working with Chat

- The chat route drives `runAgent()` (`src/main/lib/ai/kernel/run.ts`); pi's
  `Agent` handles multi-step tool calling, parallel tools and cancellation
- Persistence is `RunRecorder.persist()` from the route's `finally` — however
  the run ended, the steps that completed are saved with the run's `runId`
- Message content is stored as JSONB in `message.content`; `message.runId`
  groups a run's rows (index `message_chat_run_idx`)

### When Working with the Chat Render Path

A reply streams at up to ~25 frames a second and every frame gives `<Chat>` a
new `messages` array, so anything that re-renders per frame is paid for
hundreds of times per answer. What keeps it cheap — all of it guarded by
`tests/unit/renderer/components/messages-rerender.test.ts`,
`tests/unit/renderer/hooks/use-chat.test.ts` and
`tests/unit/renderer/lib/markdown-blocks.test.ts`:

- **`useChat` hands out stable callbacks.** `sendMessage`, `regenerate`, `stop`
  and `setMessages` must not depend on `messages` — they read the live list
  from a ref that `setMessages` keeps in sync, and `prepareBody` / the `on*`
  callbacks from refs synced in an effect. `regenerate` is a prop of every
  assistant turn: when it changed per frame, the whole transcript re-rendered
  per frame, straight through its `memo`.
- **One run, one assistant message.** `groupIntoSegments` groups by
  `runId` (segment key `run:<runId>`); `buildAssistantTurn` joins every
  assistant text block of the run into one `body` under one
  `ThinkingTimeline`, with one action bar. A provider error is pinned to the
  run it ended (`useChat().runError`) and shown at that message's foot.
- **Unchanged segments keep their identity.** `groupIntoSegments` and
  `buildCitationSources` (`messages.tsx`) take a cache and return the same
  segment objects / source arrays for turns a frame did not touch.
  `AssistantTurnSegment` and `Markdown` are memoized on exactly those
  identities — never build a fresh array or object per render for a prop of
  either.
- **Markdown renders block by block while it streams.** `useMarkdownBlocks`
  splits a changing document into top-level blocks
  (`lib/markdown-blocks.ts`, same remark config as the renderer via
  `lib/markdown-plugins.ts`), each a memoized `MarkdownBlock`, so a frame
  re-parses the last block or two instead of the whole answer. Text that never
  changes (history) is rendered whole. A plugin added to the renderer must be
  added to `markdown-plugins.ts`, not to `markdown.tsx`. The last block is
  passed through `healStreamingTail` (`remend` closes an open `**`, `*`,
  `~~`, `` ` `` or `$$` and neutralises a half-typed link; a half-streamed
  `【N-source】` marker is dropped) so nothing flashes as literal markup. The
  `【N-source】` citation chips live in `markdown-citations.tsx`. (A 2026-09-22
  spike compared streamdown, markdown-to-jsx and md4x: the splitter already
  parses in ~1 ms a frame, the same as streamdown's own; markdown-to-jsx has
  no math; md4x emits HTML, not a React tree. streamdown was tried behind a
  switch and dropped — its styling did not drop in over ours.)
- **Memoized leaves take only what they render.** The composer
  (`multimodel-input.tsx`) and `ChatToc` are `memo`'d; don't pass them
  `messages` or anything else that changes per frame unless they show it
  (`ChatToc` compares user messages only).

### When Working with Frontend

- Use Jotai atoms for global state (avoid prop drilling)
- SWR hooks for server data fetching with automatic revalidation
- Always use path alias `@` for renderer imports
- Tailwind + Radix UI for consistent styling
- Toast notifications via `sileo` (mounted once as `<AppToaster />` per
  layout — chat/settings/philharmonic); `sonner`'s `Toaster` is a leftover
  shadcn primitive (`components/ui/sonner.tsx`) that is never mounted, so
  `sonner`'s `toast()` calls render nothing — use `sileo` instead

### Security Considerations

- `docs/security-hardening.md` is the reference: the threat model, what is in
  place and the smaller items still open — read it before touching the server
  middleware, preload, window creation, the LAN listener or the artifact sandbox
- Windows run with `sandbox: true` + `contextIsolation: true`; `hardenRenderers()`
  (`src/main/lib/security.ts`) cancels navigation away from the app, denies new
  windows, opens only `http(s)` / `mailto` links externally, and grants
  permissions only to Exodus's own pages. Never call `shell.openExternal`
  directly — use `openExternalSafely`
- **The artifact sandbox has an origin of its own** (`exodus-artifact://sandbox`,
  `src/main/lib/artifact-protocol.ts`), which is the whole of its isolation:
  model-written code there cannot reach `window.parent`, the preload bridge or
  the API (its CSP allows no network at all, and the origin gate refuses that
  origin). Never serve it from the app's origin again, and never add anything to
  it that needs the API — it gets its code by `postMessage`
- **The API has two faces** (see Middleware Pipeline and `src/main/lib/lan/`):
  plaintext on loopback, with no token — a local process can read `~/.exodus`
  anyway, and browsers are stopped by the origin gate; and HTTPS on the LAN,
  where every request needs a paired device's token and the certificate is
  pinned by the device. A paired device gets the whole API (exodus-ios edits
  provider keys), which is why that path is TLS-only
- API keys stored locally in PGlite database

## Testing

```bash
bun run test             # Run all unit tests with Vitest
bun run test:watch       # Run tests in watch mode
bun run test:coverage    # Run tests with V8 coverage report
bun run test:e2e:electron  # Playwright Electron E2E (packages first: it drives the production build in .vite/; the app boots pi's scripted provider — EXODUS_FAUX_PROVIDER=1 from the fixture — so chat specs need no key)
bun run test:e2e:api       # Playwright API integration (needs a running app + .env.test)
bun run test:e2e:providers # Provider compatibility (needs API keys in .env.test)
```

### Database

```bash
bun run db:generate      # Generate Drizzle migrations from schema
```

### Other

```bash
bun run i18n:check       # Verify catalog parity across all locales (also runs in the pre-commit gate)
bun run i18n:status      # Print the translation-review status board per locale
```

## Architecture

### Electron Process Model

Exodus uses a three-process architecture:

1. **Main Process** (`src/main/main.ts`):
   - Manages Electron app lifecycle, window creation, and IPC
   - Runs Hono HTTP server on `localhost:60223` (constant `SERVER_PORT` in `packages/shared/src/constants/systems.ts`)
   - Initializes PGlite database with pgvector extension
   - MCP server connection is archived (commented out in `app.ts`); an `/api/v1/mcp` route + settings remain
   - Handles auto-updates via `update-electron-app` (`src/main/lib/auto-updater.ts`, which keeps the state machine the renderer's update panel speaks)

2. **Renderer Process** (`src/renderer/`):
   - React 19 application with React Router v7
   - Communicates with main process via HTTP (localhost:60223)
   - Uses Jotai for global state management
   - SWR for server state fetching
   - Entry points: main app plus the sub-apps searchbar, quick-chat, artifacts

3. **Preload Process** (`src/preload/preload.ts`):
   - Provides secure bridge between renderer and Electron APIs
   - Context isolation + sandbox enabled
   - Exposes `window.electron` (`ipcRenderer.{send,invoke,on,once,removeListener,removeAllListeners}` + `process.{platform,versions}` — deliberately not `process.env` — the same nested shape as `@electron-toolkit/preload`'s `electronAPI`, reimplemented without the dependency) and `window.api` (`os`, `locale`)

### Data directory, ports and isolation

Exodus is the successor of the older `universal-client` app and shares its
`~/.exodus` layout, so a dev build sees the same chats, settings and memories:

- **Data dir**: `~/.exodus` for packaged _and_ unpackaged runs (`bun run start`,
  `electron .`) — `getExodusHome()` in `src/main/lib/paths.ts`; startup logs the
  directory in use (`Data directory`); `~/.exodus/analytics` holds the DuckDB
  chat-audit snapshot. **PGlite is single-process: never run two
  Exodus processes (a dev build, the packaged app, universal-client) against it
  at the same time** — the database can be corrupted (backups live in
  `~/.exodus/backups`). Between Exodus builds this is enforced:
  `src/main/lib/single-instance.ts` takes Electron's single-instance lock from
  `db/db.ts`, before PGlite is constructed (dev and packaged share `userData`,
  so they share the lock); a second launch exits and the running app raises its
  window, or — if the holder is quitting — waits for it. universal-client has
  its own `userData` and is not covered. `EXODUS_HOME` points a run at another directory.
- **Electron `userData`**: the default `~/Library/Application Support/Exodus`
  for every build — it only holds Chromium state (localStorage, caches) and is
  where the legacy-location migration looks. There is no `-dev` variant of
  anything.
- **Server ports** (`packages/shared/src/constants/systems.ts`): `SERVER_PORT =
60223` is plaintext HTTP bound to loopback only (`127.0.0.1` and `::1`) — the
  renderer, exodus-cli, `tests/api` and the iOS Simulator; nothing on the LAN
  can reach it. `LAN_SERVER_PORT = 60224` is what `exodus-ios` on a device
  connects to. Don't change either without updating the clients.
- **E2E**: `playwright.config.ts` points `$HOME` at a scratch dir
  (`<tmpdir>/exodus-e2e-home`); the electron fixture wipes `~/.exodus` under it
  before every test and throws at import unless `$HOME` is that dir. It also
  refuses to launch while anything answers on `localhost:60223`: the renderer
  always talks to that port, so a running dev build (`bun run start`) would be
  driven by the suite instead of the app under test — reading and writing the
  real `~/.exodus` through it. To test a
  packaged build by hand, sandbox `$HOME` and pass `--user-data-dir` the same way.

### Skills (skills.sh)

Agent Skills come from **skills.sh** (the ClawHub marketplace was dropped for
quality reasons). `src/main/lib/ai/skills/`:

- `skills-sh-client.ts` — list / search / detail / audit against the BFF relay
  `SKILLS_SH_BFF_URL` (`https://skills-md.yancey.app`, the same relay
  `exodus-cli` uses; `EXODUS_SKILLS_BFF_URL` overrides it).
- `skills-store.ts` — installs a skill's `files[]` under
  `~/.exodus/skills/<slug>/` and records it in `~/.exodus/skills/.lock.json`
  (files first, lockfile last; paths that escape the slug dir are refused).
  Same directory and lockfile shape as `exodus-cli`, so skills installed by
  either are visible to both.
- `skills-manager.ts` — the seam chat + Philharmonic consume:
  `listInstalledSkills()`; for chat, `getActiveSkillsIndex()` — one line per
  active skill (slug, the SKILL.md frontmatter `description` folded onto one
  line, the absolute path of its SKILL.md) that the system prompt carries in
  `<skills>`, so the model reads a skill's body with `read_file` only when a
  task matches (the Agent Skills spec's own model; constant prompt cost);
  for Philharmonic, `getSkillsContentBySlugs()` / `getActiveSkillsContent()`
  (full bodies, frontmatter stripped, `$SKILL_DIR` baked to the install path,
  wrapped in `<active_skills>`).

Route `/api/v1/skills` (`src/main/lib/server/routes/skills.ts`): `GET
/registry?view&page&per_page`, `GET /search?q`, `GET /curated` (the registry's
publishers, each with every skill it maintains — ~2 MB, no parameters), `GET
/detail?id`, `GET /audit?id` (`null` when unaudited), `GET /installed`, `POST
/install {id}`, `DELETE /:slug`, `PATCH /:slug/toggle`. Skill ids are
`owner/repo/slug`, hence query params. UI: Settings → Skills Market
(`src/renderer/components/skills-market/`), built from the Settings kit like
every other page (one-line list rows — rank, name, source, an "Installed"
badge, installs on the right; no icon tiles, no mono outside commands and file
paths): Discover (search; All time / Trending / Hot leaderboards, same-repo
rows collapsed behind "+N more"; Curated — `curated.tsx`, publishers sorted by
installs, each opening to its skills with the registry's featured pick
badged) → detail page (security audit card, the copyable `exodus skills
install <id>` command, README card, bundled files) → install / toggle /
uninstall; an Installed tab. The page header is one short band: the intro on
the left and, on the right, a compact terminal block for `exodus-cli`
(`cli-notice.tsx`: package-manager tabs + two copyable commands, built from the
same `CommandLine` the detail page uses); it stacks in a narrow window. Spec:
`docs/superpowers/specs/2026-09-19-skills-sh-market-design.md`.

### Chat Audit (DuckDB)

Settings → Developer → Chat Audit is a read-only SQL console over a DuckDB
snapshot of the user's data (`src/main/lib/analytics/`, route
`/api/v1/analytics`, page `settings-form/chat-audit.tsx`). `snapshot.ts`
copies `chat` / `message` / `project` out of PGlite via NDJSON into
`~/.exodus/analytics/exodus.duckdb` (usage flattened to `*_tokens` /
`cost_usd` columns, `content` kept as JSON) and adds a `logs` view straight
over `~/.exodus/logs/*.jsonl`; `duckdb.ts` lazy-`import()`s
`@duckdb/node-api` on first use (never at boot), opens the file
`READ_ONLY` for queries and `READ_WRITE` only while rebuilding, serialised
on one promise chain, and caps results at 500 rows. The editor is Monaco
(`settings-form/chat-audit-editor.tsx`, SQL language, ⌘↩ bound via the editor,
completions from `packages/shared/src/constants/chat-audit-schema.ts`, which
is also what `snapshot.ts` builds the tables from). Presets live in
`packages/shared/src/constants/chat-audit-presets.ts` and every one is
executed against a fixture snapshot in
`tests/unit/main/lib/analytics/snapshot.test.ts`. PGlite stays the only
write path. Packaging: the package is a Vite external and forge keeps
`node_modules/@duckdb/**` + `detect-libc` and unpacks `@duckdb/**` from
asar (the `.node` dlopens `libduckdb` beside itself). Research notes:
`docs/duckdb-research.md`; spec:
`docs/superpowers/specs/2026-09-19-duckdb-chat-audit-design.md`.

### Colour tone

Settings → General → Color tone (`generals.tsx`) persists `settings.colorTone`
(`ColorToneSchema`: neutral | emerald | blue | violet | rose | orange | yellow;
a `text` column defaulting to `neutral`). The value becomes `data-tone` on
`<html>`, and `globals.css` carries one `[data-tone='…']` /
`.dark[data-tone='…']` token block per tone (neutral is the base
`:root` / `.dark`). `src/renderer/lib/tone.ts` applies the attribute and
mirrors it to localStorage (`exodus-color-tone`) so every entry (`main.tsx`

- the three sub-apps) can call `bootTone()` before React mounts (no flash);
  `components/tone-bridge.tsx` follows `useSettings()` in the main window and
  sub-apps follow via the `storage` event. The light/dark/system mode stays in
  next-themes' `vite-ui-theme` key.

### Migration status

`docs/migration-plan.md` records how the business code was ported from
universal-client and every place it deliberately diverges (React Compiler left
off, seven oxlint style rules downgraded to warnings, auto-updater state machine
rebuilt on `update-electron-app`, …). Read it before changing build/packaging code.

### Backend Server Architecture

The main process runs a **Hono HTTP server** that handles all business logic:

**Server Routes** (`src/main/lib/server/routes/`, registered in `src/main/lib/server/app.ts`):

Every business endpoint is mounted on one versioned sub-app (`app.route('/api/v1', v1)`), so the public paths are `/api/v1/<route>`; the lock/trace/settings middlewares still match `/api/*`. A breaking API change ships as a new `/api/v2` sub-app beside v1 rather than mutating v1 in place. Any client of this backend (the renderer, `tests/api`, `exodus-ios`) must address `/api/v1/...`.

`/api/v1/chat`, `/api/v1/lcm`, `/api/v1/history`, `/api/v1/knowledge-base`, `/api/v1/project`, `/api/v1/settings`, `/api/v1/skills`, `/api/v1/audio`, `/api/v1/db-io`, `/api/v1/deep-research`, `/api/v1/discover`, `/api/v1/tools`, `/api/v1/philharmonic`, `/api/v1/s3`, `/api/v1/mcp`, `/api/v1/memory`, `/api/v1/usage`, `/api/v1/logs`, `/api/v1/backup`, `/api/v1/artifacts`, `/api/v1/computer-use`, `/api/v1/analytics`, `/api/v1/pair`, `/api/v1/devices`, `/api/v1/lock` (mounted directly on `app`, ahead of the lock gate — see App Lock).

The `/api/v1/settings` route includes `POST /api/v1/settings/models` — dispatches to the appropriate list-models handler based on the provider in the request body, reading the API key from the request (not from saved settings) to fetch live model catalogs.

**Middleware Pipeline** (order in `app.ts`):

1. Origin gate (`createOriginGate`) — a request must carry no `Origin` (exodus-ios, exodus-cli, `tests/api`, and the packaged renderer: a `file://` page in Electron sends none) or, in a dev build only, exactly the Vite renderer's; anything else — a website, another loopback port, `null`, an extension, the artifact sandbox — gets `403`, as does a request on the loopback listener addressed by a public `Host` (DNS rebinding). Runs before CORS so a refused origin gets no `Access-Control-Allow-Origin`. Which listener took a request is in the bindings (`listenerOf(c)` in `server/types.ts`)
2. CORS middleware (`hono/cors`)
3. Auth gate (`authGate`) — on the LAN listener a request needs `Authorization: Bearer <token>` of a paired device (`401` otherwise), except `POST /api/v1/pair`, which the pairing window guards; `/api/v1/devices*` is refused there outright (`403`). Loopback passes straight through. Ahead of the lock gate so an unauthenticated request learns nothing, not even that the app is locked
4. Lock gate (`lockGate`) — rejects all `/api/*` with `423` while the app is locked. `POST /api/v1/lock/unlock` is mounted just before it (after `authGate`), so a paired device can unlock the app from the phone
5. Trace gate (`traceMiddleware`) — wraps each `/api/*` request in an `AsyncLocalStorage` trace (see `src/main/lib/logger/`), sets the `x-trace-id` response header
6. Settings injection — `getSettings()` set on the Hono context per request (served from a cache in `db/queries.ts` that `updateSettings` / `updateSettingField` invalidate — write the `settings` table only through those two)
7. Error handler (`app.onError`, returns JSON errors)

The MCP-tools middleware (injecting MCP tools into context) is **archived** (commented out in `app.ts`).

### Database Layer

**Database**: PGlite (embedded Postgres) with pgvector extension

- Location: `~/.exodus/database` (`getDatabaseDir` in `src/main/lib/paths.ts`)
- ORM: Drizzle ORM with Zod schemas
- Schema: `src/main/lib/db/schema.ts`
- Migrations: `resources/drizzle/`

**Key Tables**:

- `settings` - Global settings (models, API keys, preferences, `colorTone`)
- `knowledge_doc` - Knowledge base source documents + per-doc LightRAG sync status
- `deep_research` / `deep_research_message` - Deep research jobs and progress updates
- `memory` / `memory_usage_log` - User memory and audit trail
- `session_summary` - Summarized conversation context
- `project` - Projects
- `mcp_server` - Configured MCP servers
- `paired_device` - Devices allowed onto the LAN listener: a name and the SHA-256 of
  the device's token, never the token. Machine-local — deliberately not part of
  `db-io` export/import or of a data reset
- `lcm_summary` - Lossless context-management summaries
- `message.runId` - the run a row belongs to: the id of the run's user message
  (backfilled by migration 0008 by walking each chat in `createdAt` order; a
  row with no user row before it is a run of its own). `runId` is on every
  `ChatMessage` on the wire too
- Philharmonic: `agent`, `agent_memory`, `team`, `task`, `task_execution`, `task_execution_event`, `conversation_plan`, `plan_step`

The full chat/message tables and indexes are defined in `src/main/lib/db/schema.ts`.

### AI/LLM Integration

**Multi-Provider Support** (built on `@earendil-works/pi-ai` + `@earendil-works/pi-agent-core` 0.85):
pi 0.85 has no global registry: every request is routed by `model.provider`
to a provider registered on a `Models` collection, and the process's one
collection is `getKernelModels()` in `src/main/lib/ai/kernel/models.ts` —
the five built-in providers through pi's factories, plus Ollama as a dynamic
provider `ollama` (empty catalog; `providers/ollama.ts` hand-builds the model
per request with `provider: 'ollama'`). `streamFn` from the same file is what
every `Agent` / `agentLoop` streams through; the API key from Settings is
passed explicitly per request and wins over anything a provider would
resolve from the environment. The `/compat` entrypoint is not used.

Model resolution lives in `src/main/lib/ai/providers/`. The catalog-backed
providers (OpenAI GPT, Azure OpenAI, Anthropic Claude, Google Gemini, xAI Grok)
are one `SPECS` table + a `fromSpec` factory in `index.ts` — a row only supplies
the base-URL setting, its fallback, the default model ids, and the pi-ai
`provider` / `api` strings (xAI is `openai-responses`: pi 0.85's xai provider
serves the Responses API only). Every path resolves through the shared
`resolveModel()` in `resolve-model.ts` (do not duplicate model-resolution
logic); it looks the id up in the collection's catalog and accepts an
optional live-fetched `snapshot` parameter (from `POST /api/v1/settings/models`)
to override it. Per-provider fallback defaults (contextWindow, cost) and
`MODEL_METADATA_FALLBACK` (narrower scope: only what a provider's own list API
omits) live there. Live model lists are fetched per-provider from
`src/main/lib/ai/providers/list-models/`.

**Chat kernel** (`src/main/lib/ai/kernel/`, spec
`docs/superpowers/specs/2026-09-22-chat-kernel-design.md`):

A **run** is one user message through the final answer, with every model
step and tool result in between; `message.runId` (the user message's own id,
on every row of the run) is the unit that context assembly, compaction and
rendering work in.

- `models.ts` — the `Models` collection and `streamFn` (above)
- `run.ts` — `runAgent(input): AsyncIterable<KernelEvent>` wraps pi's `Agent`
  (`convertToLlm` asserts the run invariant, `beforeToolCall` blocks tools
  disabled in settings) and yields the kernel's own events, each stamped with
  `runId`: `message_update` · `message_end` · `tool_start` · `tool_update` ·
  `tool_end` · `run_end` (always, with the messages that completed) · `error`
  (after `run_end`, when a provider failed). Stop aborts the agent; a partial
  answer is kept, marked `aborted`
- `record.ts` — `RunRecorder`: fed every event, `persist()` from the route's
  `finally` saves the run's rows with its duration and enqueues the post-run
  jobs
- `invariant.ts` — `dropBrokenRuns()`: a provider request starts with a user
  message and every tool result follows its tool call; a violating run is
  dropped and logged, never sent (the 2026-09-21 `unexpected tool_use_id` 400)
- `events.ts` — the `KernelEvent` union; `faux.ts` / `faux-boot.ts` — pi's
  scripted provider for tests (see Testing)

**Chat Flow** (`src/main/lib/server/routes/chat.ts`):

1. Retrieve user settings (model selection, API keys)
2. Assemble the context (LCM, in whole runs) and bind built-in tools based on
   the `AdvancedTools` selection and `settings.tools.disabledTools`
3. `for await` over `runAgent()`, mapping each kernel event onto one SSE
   event through `createSseWriter` (`routes/chat-sse.ts`): streaming
   `message_update` snapshots are coalesced to one per
   `STREAM_FLUSH_INTERVAL_MS` (each carries the whole message so far), other
   events flush first so order holds, and writes become no-ops once the
   client has gone. Wire shapes are unchanged; every message carries `runId`
4. However the run ends — done, a provider error midway, or Stop (which
   cancels the response stream) — `RunRecorder.persist()` saves the messages
   that completed and enqueues background jobs (LCM compaction, memory
   consolidation, and search indexing only when Elasticsearch is configured)
   onto the pgmq-backed job queue (`src/main/lib/jobs/`) rather than running
   them inline

**Tool Architecture** (`src/main/lib/ai/calling-tools/`):
Each tool has a description for LLM understanding, a TypeBox parameter schema, and an execute function.

Built-in tools (files in `src/main/lib/ai/calling-tools/`), named in
snake_case on the wire — the names are `TOOL_NAMES` in
`packages/shared/src/constants/tool-names.ts`, the single source of truth for
the tool definitions, the binder, the system prompt, the renderer's dispatch
and the settings registry (migration 0007 rewrote stored rows from the old
camelCase; `toToolName()` maps a pre-rename `disabledTools` key):

`computer_use`, `create_artifact`, `deep_research`, `edit_file`, `find_files`, `grep`, `image_generation`, `lcm_describe`, `lcm_expand`, `lcm_grep`, `list_directory`, `map_itinerary`, `read_file`, `search_knowledge_base`, `terminal`, `weather`, `web_fetch`, `web_search`, `write_file`.

**MCP toolbox** (`calling-tools/mcp-toolbox.ts`): MCP servers are not bound
tool by tool (providers cap the tools array — OpenAI at 128 — and one server
can exceed it alone). Two tools stand in for all of them: `list_mcp_tools({
server?, query? })` returns each tool's server, name, description and
parameter schema; `call_mcp_tool({ server, tool, arguments })` forwards the
call and returns the result unchanged; the prompt's `<mcp_servers>` block
carries one line per connected server so the model knows what exists.

**System prompt** (`src/main/lib/ai/prompts.ts`, `getSystemPrompt({
mcpDirectory, workspaceDir, skillsIndex })`): the policy is autonomy — use
tools without asking or announcing, chain calls until the task is done, stop
only for a real ambiguity or a `<hard_stops>` item (deleting/overwriting
outside the workspace, `sudo`, system-wide installs, `git push`, anything sent
or paid on the user's behalf). Every built-in is explained by its wire name
(`tests/unit/main/lib/ai/prompts.test.ts` holds that — a new tool must be
added there), grouped research / files & shell / output / memory / computer;
HTML and anything visual goes through `create_artifact`. `<workspace>`,
`<skills>` and `<mcp_servers>` render only when given; citations live under
`<citation_rules>`.

**Chat workspace**: `getChatWorkspaceDir(chatId)` = `~/.exodus/workspace/<chatId>`
(`paths.ts`; not created until used). `terminal(defaultCwd)` and
`findFiles(defaultRoot)` are factories, bound to the workspace when
`bindCallingTools` gets a `chatId` and to the user's home otherwise
(Philharmonic keeps `~/.exodus/groups/<id>` as its own).

### Knowledge Base (LightRAG)

The knowledge base is backed by an **optional, self-hosted LightRAG server** the user runs (Exodus is a client only — see `docs/lightrag-setup.md`). `knowledge_doc` rows are the editable source-of-truth (Settings → Knowledge Base); the `kb-sync` job (`src/main/lib/jobs/handlers.ts`) pushes them into LightRAG via `src/main/lib/knowledge-base/lightrag-client.ts` (delete + re-insert on edit), and `reconcile.ts` on the jobs cron settles each row's `indexStatus` via LightRAG's `track_status`. `resolveKnowledgeBase(settings)` (never throws) gates the `searchKnowledgeBase` tool, bound by `bindCallingTools` for the main chat and every Philharmonic employee loop. Retrieval is context-only (`only_need_context: true`) — Exodus's own model writes the answer. No scoping: one shared KB.

### Deep Research

**Architecture** (`src/main/lib/ai/deep-research/`):

Multi-level recursive research with real-time progress streaming:

1. **Query Generation** (`generate-queries.ts`):
   - AI generates search queries based on topic
   - Configurable breadth (default: 4 queries per level)

2. **Search Execution** (`deep-research.ts`):
   - Executes Serper API searches recursively
   - Depth parameter controls recursion levels (default: 2)
   - Processes results and extracts learnings

3. **Result Processing** (`process-search-results.ts`):
   - Extracts key insights from search results
   - Identifies web sources with titles and URLs
   - Determines next research directions

4. **Report Generation** (`final-report.ts`):
   - Compiles all findings into structured Markdown report
   - Includes source citations
   - Stored in database for later retrieval

5. **Progress Streaming** (`src/main/lib/server/routes/deep-research.ts`):
   - SSE connection for real-time updates
   - Status: `streaming` → `completed` or `failed`
   - Frontend polls for progress messages

### MCP (Model Context Protocol)

**Integration** (`src/main/lib/ai/mcp.ts`):

> Note: automatic MCP server connection at startup is **archived** (`connectMcpServers()` is commented out in `app.ts`). The `/api/v1/mcp` route and MCP settings remain. The flow below describes the intended/legacy behavior.

Allows external tools/servers to be integrated via MCP protocol:

1. **Configuration**: Users define MCP servers in settings JSON:

```json
{
  "mcpServers": {
    "git": { "command": "git-mcp", "args": [] },
    "filesystem": { "command": "fs-server", "args": [] }
  }
}
```

2. **Connection** (`connectMcpServers()`):
   - Launches each server via StdIO transport
   - Retrieves available tools from each server
   - Stores tools in Hono context

3. **Tool Execution**:
   - MCP tools merged with built-in tools
   - AI can call MCP tools during conversation
   - Results returned via standard MCP protocol

**Key Dependencies**:

- `@ai-sdk/mcp` - MCP client
- `@modelcontextprotocol/sdk` - MCP protocol implementation

### Memory & Personalization Layer

**Memory System** (`src/main/lib/ai/memory/manager.ts`):

A durable, topic-consolidated memory of the user. Key functions:
`runMemoryConsolidation()`, `loadRelevantMemories()`, `formatMemoriesForSystem()`.

**Memory entries** (one row per topic/person in the `memory` table):

- `section` - `profile` (durable identity / setup / hard constraints / stable
  preferences) | `topic` (an interest, project, recurring subject) | `person`
- `key` - short stable title (e.g. "Classical Music")
- `summary` - one sentence; `details` - `string[]` of bullets

**Memory Operations** (all in `src/main/lib/ai/memory/manager.ts`):

1. **Consolidation** (`runMemoryConsolidation()`) — `memory-consolidate` job
   after each turn when `memory.autoCapture`. One LLM call sees the
   conversation + the existing memory index and returns `create`/`update`
   operations. Prefers updating an existing entry (returning its full revised
   summary + details) over inserting a duplicate.

2. **Read filter** (`loadRelevantMemories()` / `formatMemoriesForSystem()`) —
   pre-turn when `memory.useInChat`. One LLM call picks the relevant
   entries; selected entries are recorded in `memory_usage_log` and get
   `lastUsedAt` bumped, then rendered into a `<user_memory>` system block.

### Philharmonic (multi-agent Groups)

Philharmonic runs multi-agent "Groups" (teams of agents collaborating on tasks).

- Main process: `src/main/lib/ai/philharmonic/` (employee loop, execution engine, agent memory/tools, knowledge-base tools)
- Renderer: `src/renderer/components/philharmonic/`
- Route: `/api/v1/philharmonic`
- Each Group gets an isolated workspace under `~/.exodus/groups`
- Scheduled tasks (`task.cronExpression` for recurring, `task.runAt` for
  one-off) run via `src/main/lib/ai/philharmonic/scheduler.ts`
  (per-task `node-cron` jobs + a once-a-minute sweep for one-off tasks);
  managed from the Schedule tab on the Dashboard page
  (`components/philharmonic/schedule/`)

### App Lock

A local PIN lock protects the app and gates all API access.

- Main process: `src/main/lib/lock/` (`lock-manager` state machine, `pin-store` using scrypt + Electron `safeStorage`, `idle-watcher`, `lock-config`, IPC handlers)
- The `lockGate` middleware rejects every `/api/*` request with `423` while locked (`/api/v1/lock/unlock` excepted, below)
- Unlock is IPC (the lock screen: PIN, or the Mac's Touch ID) or `POST
/api/v1/lock/unlock` (`routes/lock.ts`), the one API route mounted ahead of
  `lockGate`. It reads no PIN: a paired device's own biometric (Face ID on
  the phone) stands in for it, the way Touch ID does locally — the trust is
  in holding a device token. `authGate` still runs first, so on the LAN only
  a paired device reaches it; on loopback any local process can, which the
  threat model already trusts (it can read `~/.exodus`)
- The encrypted PIN secret lives at `~/.exodus/lock.dat`
- Renderer: `src/renderer/components/lock/`

### LCM (lossless context management)

Compacts long conversations without losing information, surfacing summaries the agent can expand or grep.

- Main process: `src/main/lib/ai/context-management/` (compaction, context assembler, token counter, status bus)
- Route: `/api/v1/lcm`
- Related built-in tools: `lcm_describe`, `lcm_expand`, `lcm_grep`
- **The run is the atom.** `assembleContext(chatId, budget, freshTailRuns)`
  groups context items by `message.runId` (`groupItemsIntoRuns`): the fresh
  tail is the most recent N runs, whole; back-fill adds whole older runs,
  newest first, and stops at the first that does not fit; leaf compaction
  chunks on run boundaries. So a request starts with a user message and every
  tool result follows its tool call — a 40-seed property test on a real PGlite
  (`context-assembler.property.test.ts`) holds it. `memory.freshTailSize`
  counts runs (default 6, range 2–24; `freshTailRuns()` clamps a value saved
  when it counted messages). Philharmonic's own LCM keeps a fixed 16-message
  tail

### Sub-apps

Separate renderer entry points under `src/renderer/sub-apps/`: `searchbar`, `quick-chat`, `artifacts`.

### Frontend Structure

**Stack**:

- React 19 with TypeScript
- React Router v7 for navigation
- Jotai for global state management (atoms in `src/renderer/stores/`)
- SWR for server state fetching
- Tailwind CSS + Radix UI components
- @tiptap for rich text editing (Immersive Editor)
- Monaco Editor for code display
- Three.js for 3D visualizations

**Key Directories**:

- `components/` - Reusable UI components (including shadcn/ui)
- `services/` - API call wrappers (chat, RAG, settings, etc.)
- `stores/` - Jotai atoms for global state
- `hooks/` - Custom React hooks
- `layouts/` - Page layouts (workspace, chat)
- `routes/` - Route definitions
- `containers/` - Page-level components
- `sub-apps/` - Special entry points (searchbar, quick-chat)

**API Communication**:

- All API calls via `fetcher()` utility to `http://localhost:60223/api/*`
- Streaming responses are consumed from the server's `runAgent()`-driven SSE stream (`lib/stream-manager.ts`)
- SWR for caching and revalidation

### Path Aliases

**Main Process** (`tsconfig.node.json`): no aliases — relative imports, plus the
`@exodus/shared/*` workspace package. Main-process code imports DB row types
straight from `src/main/lib/db/schema.ts` (the shared package must not import the app).

**Renderer Process** (`tsconfig.web.json`):

- `@` → `src/renderer`
- `@exodus/shared/*` → the `packages/shared` workspace package (subpath exports, see its `package.json`)
- DB row types come from `@/types/db` (a renderer-side passthrough of `src/main/lib/db/schema.ts`)

**Shared Code** (`packages/shared/src/`, imported as `@exodus/shared/...`):

- `types/` - Shared TypeScript types
- `constants/` - Constants used across processes
- `utils/` - Utility functions
- `schemas/` - Zod schemas
- `errors/` - Custom error classes

## Important Implementation Notes

### When Working with AI Providers

- Providers resolve a `Model` (from `@earendil-works/pi-ai`) via the shared `resolveModel()` in `src/main/lib/ai/providers/resolve-model.ts` — do NOT duplicate model resolution logic
- `resolveModel()` accepts an optional `snapshot` parameter (live-fetched from `POST /api/v1/settings/models`) to override the pi-ai registry
- Per-provider fallback defaults (contextWindow, cost) and `MODEL_METADATA_FALLBACK` are centralized in `resolve-model.ts`
- Model lists are now live-fetched per provider from Settings via `src/main/lib/ai/providers/list-models/`
- Model names/API keys are retrieved from settings (never hardcode)
- One-shot completions go through `completeSimple` from `src/main/lib/ai/utils/complete.ts` (see Shared Utilities) — pi-ai does not throw on a failed request
- `@earendil-works/pi-ai` / `pi-agent-core` 0.85: there is no global `stream`/`complete`/`getModel` — everything goes through `getKernelModels()` (`src/main/lib/ai/kernel/models.ts`); `completeSimple` still comes from `src/main/lib/ai/utils/complete.ts`; the `/compat` entrypoint is not used. `ThinkingLevel` has `max` and no `off` (the app's `off` means no reasoning option). History: `docs/pi-ai-review.md`

### When Working with Database

- Always use Drizzle ORM queries (`src/main/lib/db/queries.ts`)
- Schema changes require running `bun run db:generate` to create migrations
- Vector searches use `cosineDistance()` from pgvector
- All timestamps use `timestamp('created_at').notNull().defaultNow()`

### When Working with Tools

- Tool definitions go in `src/main/lib/ai/calling-tools/`; the `name` is a
  `TOOL_NAMES` entry (`packages/shared/src/constants/tool-names.ts`), added
  there first — snake_case, and never renamed once rows carry it
- Tools are bound conditionally based on the `AdvancedTools` selection and
  `settings.tools.disabledTools`; a call to a disabled tool is also blocked in
  the kernel's `beforeToolCall`
- Parameters are TypeBox schemas (`Type` from `@earendil-works/pi-ai`)
- Enum parameters use pi-ai's `StringEnum([...] as const)`, never
  `Type.Union([Type.Literal(...)])` — that emits `anyOf`/`const`, which
  Google's function-calling schema rejects
- Tool descriptions are critical for LLM understanding
- Return structured data that the LLM can interpret

### When Working with Chat

- The chat route drives `runAgent()` (`src/main/lib/ai/kernel/run.ts`); pi's
  `Agent` handles multi-step tool calling, parallel tools and cancellation
- Persistence is `RunRecorder.persist()` from the route's `finally` — however
  the run ended, the steps that completed are saved with the run's `runId`
- Message content is stored as JSONB in `message.content`; `message.runId`
  groups a run's rows (index `message_chat_run_idx`)

### When Working with the Chat Render Path

A reply streams at up to ~25 frames a second and every frame gives `<Chat>` a
new `messages` array, so anything that re-renders per frame is paid for
hundreds of times per answer. What keeps it cheap — all of it guarded by
`tests/unit/renderer/components/messages-rerender.test.ts`,
`tests/unit/renderer/hooks/use-chat.test.ts` and
`tests/unit/renderer/lib/markdown-blocks.test.ts`:

- **`useChat` hands out stable callbacks.** `sendMessage`, `regenerate`, `stop`
  and `setMessages` must not depend on `messages` — they read the live list
  from a ref that `setMessages` keeps in sync, and `prepareBody` / the `on*`
  callbacks from refs synced in an effect. `regenerate` is a prop of every
  assistant turn: when it changed per frame, the whole transcript re-rendered
  per frame, straight through its `memo`.
- **One run, one assistant message.** `groupIntoSegments` groups by
  `runId` (segment key `run:<runId>`); `buildAssistantTurn` joins every
  assistant text block of the run into one `body` under one
  `ThinkingTimeline`, with one action bar. A provider error is pinned to the
  run it ended (`useChat().runError`) and shown at that message's foot.
- **Unchanged segments keep their identity.** `groupIntoSegments` and
  `buildCitationSources` (`messages.tsx`) take a cache and return the same
  segment objects / source arrays for turns a frame did not touch.
  `AssistantTurnSegment` and `Markdown` are memoized on exactly those
  identities — never build a fresh array or object per render for a prop of
  either.
- **Markdown renders block by block while it streams.** `useMarkdownBlocks`
  splits a changing document into top-level blocks
  (`lib/markdown-blocks.ts`, same remark config as the renderer via
  `lib/markdown-plugins.ts`), each a memoized `MarkdownBlock`, so a frame
  re-parses the last block or two instead of the whole answer. Text that never
  changes (history) is rendered whole. A plugin added to the renderer must be
  added to `markdown-plugins.ts`, not to `markdown.tsx`. The last block is
  passed through `healStreamingTail` (`remend` closes an open `**`, `*`,
  `~~`, `` ` `` or `$$` and neutralises a half-typed link; a half-streamed
  `【N-source】` marker is dropped) so nothing flashes as literal markup. The
  `【N-source】` citation chips live in `markdown-citations.tsx`. (A 2026-09-22
  spike compared streamdown, markdown-to-jsx and md4x: the splitter already
  parses in ~1 ms a frame, the same as streamdown's own; markdown-to-jsx has
  no math; md4x emits HTML, not a React tree. streamdown was tried behind a
  switch and dropped — its styling did not drop in over ours.)
- **Memoized leaves take only what they render.** The composer
  (`multimodel-input.tsx`) and `ChatToc` are `memo`'d; don't pass them
  `messages` or anything else that changes per frame unless they show it
  (`ChatToc` compares user messages only).

### When Working with Frontend

- Use Jotai atoms for global state (avoid prop drilling)
- SWR hooks for server data fetching with automatic revalidation
- Always use path alias `@` for renderer imports
- Tailwind + Radix UI for consistent styling
- Toast notifications via `sileo` (mounted once as `<AppToaster />` per
  layout — chat/settings/philharmonic); `sonner`'s `Toaster` is a leftover
  shadcn primitive (`components/ui/sonner.tsx`) that is never mounted, so
  `sonner`'s `toast()` calls render nothing — use `sileo` instead

### Security Considerations

- `docs/security-hardening.md` is the reference: what is in place, and the
  open items (artifact sandbox shares the app's origin; LAN clients are
  unauthenticated) — read it before touching the
  server middleware, preload, window creation, or the artifact sandbox
- Windows run with `sandbox: true` + `contextIsolation: true`; `hardenRenderers()`
  (`src/main/lib/security.ts`) cancels navigation away from the app, denies new
  windows, opens only `http(s)` / `mailto` links externally, and grants
  permissions only to Exodus's own pages. Never call `shell.openExternal`
  directly — use `openExternalSafely`
- API keys stored locally in PGlite database
- No authentication on the HTTP API, which listens on every interface for
  exodus-ios; the origin gate (see Middleware Pipeline) only stops browsers

## Testing

### Framework

Vitest v4 with the following configuration (`vitest.config.ts`):

- Path aliases: `@main` → `src/main`, `@` → `src/renderer` (shared code is imported as `@exodus/shared/...` through the workspace package)
- Test files: `tests/unit/**/*.test.ts`
- Coverage: V8 provider targeting `packages/shared/src/` and `src/main/lib/`

### Writing Tests

- Tests live under `tests/unit/`, mirroring the source tree: `src/main/lib/paths.ts` → `tests/unit/main/lib/paths.test.ts`. Test files are never co-located with the module they test — this keeps `src/` free of test files. A dedicated `tsconfig.test.json` (referenced from the root `tsconfig.json`) covers `tests/unit/**/*` for editor support; it is intentionally not part of the `bun run typecheck` gate.
- The default environment is `node`. A test that needs a DOM (rendering a
  component or a hook) starts with `// @vitest-environment happy-dom` and drives
  React with `createRoot` + `act` — still a `.test.ts` file, using
  `createElement` rather than JSX (see
  `tests/unit/renderer/hooks/use-chat.test.ts`). Use it for render-count and
  identity guarantees; pure logic stays in `node`.
- Import the module under test via the matching alias (`@main/...`, `@/...`, or `@exodus/shared/...`), not a relative path — relative paths would need to reach back out of `tests/unit/` into `src/`.
- Tests for main-process code that transitively imports Electron/PGlite must mock those modules:

```typescript
vi.mock('@main/lib/db/db', () => ({ pglite: {} }))
vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
```

- Use `await import('@main/lib/paths')` (alias, not a relative path) after mocks for dynamic import when needed
- **Anything that talks to a model is tested on pi's faux provider**, never
  a key: `registerFauxProvider()` (`src/main/lib/ai/kernel/faux.ts`) puts it
  on the kernel collection, `setResponses([...])` scripts the replies
  (`fauxAssistantMessage`, `fauxText`, `fauxToolCall` from
  `@earendil-works/pi-ai`; a response factory answers from the context). Each
  registration replaces the one before it, so register last and pass
  `handle.getModel()` in. Modules that one-shot through `completeSimple` are
  mocked at `@main/lib/ai/kernel/models` (`getKernelModels: () => ({
completeSimple })`). See `tests/unit/main/lib/ai/kernel/run.test.ts` and
  `tests/unit/main/lib/server/routes/chat.faux.test.ts`
- **A migration or a query is tested on a real in-memory PGlite** with the
  shipped migrations applied: `createMigratedPglite('0008')` in
  `tests/unit/helpers/migrated-pglite.ts` (plus `migrationFile()` /
  `migrationSql()` to apply the one under test), mocked in as `@main/lib/db/db`
  with `drizzle(pglite)` where the module under test imports `db`

### Shared Utilities

Reusable AI utilities that should be used (and tested) instead of inline implementations:

- `src/main/lib/ai/utils/complete.ts` — `completeSimple()`: the kernel collection's, except a failed request rejects (`LlmRequestError`). pi-ai itself **resolves** on a 429 / bad key / dropped connection, to an empty message with `stopReason: 'error'`, which reads as "the model said nothing". Always import `completeSimple` from here, and make sure the caller's `catch` does something sensible
- `src/main/lib/ai/utils/llm-response-util.ts` — `extractTextFromCompletion()` and `parseJsonFromLlmResponse()` for parsing LLM outputs
- `src/main/lib/ai/utils/conversation-util.ts` — `extractConversationText()` for converting messages to text
- `src/main/lib/ai/providers/resolve-model.ts` — Shared `resolveModel()` with per-provider fallback defaults

## Testing Locally

1. Install dependencies: `bun install`
2. Start dev server: `bun run start`
3. The app will launch with hot reload enabled
4. Database automatically initialized on first run
5. Configure at least one AI provider in settings before chatting
6. The dev window opens DevTools automatically. A console error whose stack is
   only `VMnnn` / `<anonymous>` frames — e.g. `Cannot read properties of
undefined (reading 'startTime') at …reportAllChanges` — is not app code (app
   frames show `localhost:5173/src/...`, and nothing here depends on
   `web-vitals`): it is the script DevTools injects for the Performance panel's
   Live metrics, and is noise.

## Common Development Patterns

### Adding a New Tool

1. Create tool file in `src/main/lib/ai/calling-tools/my-tool.ts`
2. Define Zod schema for inputs
3. Implement the execute function
4. Register it in `src/main/lib/ai/calling-tools/index.ts`
5. Wire it into the chat tool-binding logic
6. Add UI toggle if needed in settings

### Adding a New Route

1. Create route file in `src/main/lib/server/routes/my-route.ts`
2. Define Hono route handlers
3. Import and register in main server setup
4. Create corresponding service in `src/renderer/services/my-service.ts`
5. Use SWR hook for data fetching in components

### Adding a New Provider

1. Add the `AiProviders` enum member in `packages/shared/src/types/ai.ts`
2. Add a `SPECS` row in `src/main/lib/ai/providers/index.ts` (base-URL
   getter + fallback, default model ids, pi-ai `provider` / `api`). A provider
   that can't go through `resolveModel()` (like Ollama) gets its own module +
   a hand-written `ProviderFn` instead
3. Add a list-models handler in `src/main/lib/ai/providers/list-models/` (e.g., `my-provider.ts`) that normalizes the provider's API response
4. Register the handler in `src/main/lib/ai/providers/list-models/index.ts`
5. Add any per-provider fallback defaults to `MODEL_METADATA_FALLBACK` in `resolve-model.ts` (only what the provider's list API omits)
6. Add its key/base-URL fields to `ProvidersSchema` in `packages/shared/src/schemas/settings-schema.ts` and a tab in `settings-form/providers-tabs.tsx`

### Adding a User-Facing String

1. Add the key to the right namespace in `packages/shared/src/i18n/locales/en/<ns>.json`
   (dot-nested, component-scoped: `chat.composer.placeholder`).
2. Renderer, inside a component or hook:
   `const { t } = useTranslation('<ns>')` → `t('composer.placeholder')`;
   rich text (embedded link/bold) → `<Trans ns="<ns>" i18nKey="…">`. In the
   catalog key, a `<strong>`/`<i>`/`<p>`/`<br>` child MUST be written
   as that literal tag (`<strong>text</strong>`), never a numbered
   placeholder (`<1>text</1>`) — react-i18next's default
   `transKeepBasicHtmlNodesFor` renders exactly those 4 tags literally
   (notably, `<b>` is NOT in the default allowlist — write it as a numbered
   placeholder like any other non-allowlisted element), and a numbered
   placeholder for one of the 4 silently drops the child's content at
   render time. Numbered placeholders (`<1>`, `<2>`, …) are only
   correct for elements outside that allowlist (a custom component, `<a>`,
   `<span>`, etc.). `bun run i18n:check`/typecheck/lint do not catch a wrong
   choice here — a real render test does (see
   `tests/unit/i18n/chat-namespace.test.ts`'s
   `composerTools.mcpDialog.description` test for the pattern). If the
   file already has `useTranslation('<otherNs>')`, switch to the array form
   `useTranslation(['<otherNs>', '<ns>'])` — keep the existing namespace
   first so already-written bare `t('key')` calls keep resolving unchanged —
   and prefix every new lookup with `<ns>:`.

   A numbered placeholder's `<N>` is the child's raw 0-indexed position in
   the FULL `<Trans>` children array — text nodes and an explicit `{' '}`
   each occupy their own index too, not just element children. A block
   with two `<code>` children separated by plain text (`[text, <code>,
text, <code>, text]`) numbers them `<1>` and `<3>`; adding a `{' '}`
   anywhere before the second one shifts it to `<4>`. This makes such a
   block fragile against `bun run fmt`/oxfmt reflowing the JSX (a
   line-wrap can insert or remove an explicit `{' '}` with no visible
   change to non-`<Trans>` rendering, but it renumbers everything after
   it) — a real incident shipped with a fully green test suite because
   the test hand-copied the children into a `createElement()` call
   instead of rendering the real component, so the reflow-induced
   renumbering had nothing to fail against. For any `<Trans>` block with
   two or more non-allowlisted (numbered) children, extract it into its
   own exported component and have the test `await
import('@/path/to/the/file')` and render that component directly —
   never hand-copy its children into the test (see `s3.tsx`'s
   `PublicReadAccessNotice` and its render test in
   `tests/unit/i18n/settings-namespace.test.ts` for the pattern). Don't
   trust a manual count of the children either — dump the actual
   compiled array (`React.Children.forEach` over the component's own
   `props.children`, or an `esbuild --jsx=transform` compile) before
   writing the catalog's placeholder numbers.

3. Renderer, outside a component/hook (a plain exported function, a
   module-level helper, a `src/renderer/services/*.ts` function) —
   `useTranslation()` isn't callable there. Import the shared instance
   directly: `import { i18n } from '@/lib/i18n'` → `i18n.t('<ns>:key')`
   (always the explicit `ns:key` form — the raw instance has no namespace
   bound beyond the global `defaultNS: 'common'`).
4. Main process: `mainI18n.t('<ns>:key')` (or the `mainT()` helper in
   `src/main/lib/i18n.ts`, which additionally tolerates `mainI18n` being
   unassigned during a failed boot).
5. Dates/numbers: `useFormat()` (renderer). Never build a sentence by
   splicing a hand-formatted date/number into raw English word order — pass
   it as an interpolation param to a translated key instead.
6. Non-English catalogs are filled by the machine-translation pass — do not
   hand-edit them.
7. `src/renderer/components/ui/**` (shadcn primitives) is permanently out of
   scope for extraction — the generator (`bun run shadcn:generate`) overwrites
   these files and drops any `t()` calls added by hand.
8. Before extracting a string into an existing function scope, check whether
   that scope already binds a local `t` (a loop variable, a destructured
   field, anything) — a shadowed `t` compiles fine today but breaks the next
   namespace pass that adds a real `t()` call in the same scope.
9. **This is enforced, not just convention.** `tests/unit/i18n/no-hardcoded-strings.test.ts`
   (part of `bun run test`, so gated on every commit) scans every
   `src/renderer/**/*.{ts,tsx}` (excluding `components/ui/**` and
   `sub-apps/artifacts/sandbox.tsx`) for JSX text nodes (`.tsx` only),
   `sileo.*({ title | description })` values (including template literals
   and ternaries, in both `.ts` hooks/services and `.tsx` components), and
   `label:` properties in `src/main/lib/menu.ts`/`tray.ts` that aren't
   routed through `t()`/`<Trans>`/`mainT()`. A new hardcoded string fails
   the suite immediately — add a catalog key instead. The only escape
   hatch is `tests/unit/i18n/allowlist.ts`, reserved for genuine proper
   nouns/brand names/technical identifiers (a GitHub org slug, a license
   name, a URI scheme prefix) — never for deferred i18n debt; every entry
   needs a real reason.

### Test-ID Checkpoints (traceability)

When adding or generating an interactive element that warrants test coverage:

1. Add a semantic id to `packages/shared/src/constants/test-ids.ts` (the value mirrors the
   object path, camelCase → kebab-case), e.g. `TEST_IDS.lock.unlockButton` →
   `'lock.unlock-button'`.
2. Apply it on the element: `data-testid={TEST_IDS.lock.unlockButton}`. For the
   `PinInput` (and similar wrapped components), pass the `testId` prop instead.
3. Reference the same constant from a Playwright test in `tests/` via
   `getByTestId(TEST_IDS.lock.unlockButton)`. (Playwright does not resolve the
   workspace package specifier — import `TEST_IDS` via a relative path,
   `../../packages/shared/src/constants/test-ids`, in specs.)

Rules enforced by the Vitest linkage test `test-ids.linkage.test.ts` (runs in
`bun run test` and the pre-commit hook):

- every registry id must be applied in `src/renderer` (no orphan ids),
- every registry id must be referenced by at least one test (no uncovered ids),
- never use a raw string `data-testid="..."` — always go through the registry.

Ids are a durable contract: never rename or regenerate an existing id; only add
new ones. Dangling references to non-existent ids are caught by TypeScript (the
registry is typed). `data-testid` attributes are stripped from packaged release
builds by a small Vite `transform` plugin in `vite.renderer.config.mts` gated on
`STRIP_TEST_IDS=1` (set by `bun run make` / `bun run publish`); dev, `bun run package`
and E2E builds keep the markers.

## Code Structure

Main process:

- `src/main/main.ts` — app bootstrap, lifecycle, IPC + server startup
- `src/main/lib/server/app.ts` — Hono server + route registration
- `src/main/lib/server/routes/` — API route handlers
- `src/main/lib/server/middlewares/` — origin gate, lock gate, trace, error handler
- `src/main/lib/ai/providers/` — LLM provider resolution (`resolve-model.ts`)
- `src/main/lib/ai/providers/list-models/` — Live model catalog handlers per provider (`anthropic.ts`, `openai.ts`, `google.ts`, `xai.ts`, `ollama.ts`); each normalizes that provider's list-models API response into `{ id, displayName, snapshot: ModelSnapshot }`, dispatched by `index.ts` and called from `POST /api/v1/settings/models`
- `src/main/lib/ai/kernel/` — the chat kernel: `models.ts` (the `Models` collection, `streamFn`), `run.ts` (`runAgent()`), `record.ts` (`RunRecorder`), `invariant.ts` (`dropBrokenRuns()`), `events.ts`, `faux.ts` + `faux-boot.ts` (pi's scripted provider; `EXODUS_FAUX_PROVIDER=1`)
- `src/main/lib/ai/calling-tools/` — built-in agent tools (snake_case names from `packages/shared/src/constants/tool-names.ts`) and the MCP toolbox (`mcp-toolbox.ts`)
- `src/main/lib/ai/skills/` — skills.sh client, install store, and the prompt seam (see Skills)
- `src/main/lib/analytics/` — DuckDB chat-audit snapshot + read-only query wrapper (see Chat Audit)
- `src/main/lib/ai/philharmonic/` — multi-agent Groups
- `src/main/lib/ai/context-management/` — LCM
- `src/main/lib/ai/memory/` — personalization memory (consolidation + recall)
- `src/main/lib/lock/` — app lock (PIN, gate, idle)
- `src/main/lib/db/` — Drizzle schema + queries (PGlite)
- `src/main/lib/search/` — pluggable full-text search (PGlite default,
  optional Elasticsearch — see `resolveSearchProvider()`)
- `src/main/lib/knowledge-base/` — optional LightRAG knowledge base: HTTP
  client, `resolveKnowledgeBase()` (never-throws), and the `kb-sync`
  index-status `reconcile.ts`
- `src/main/lib/discover/` — Home Discover feed: Brave News client, memory-driven
  query generation, `runDiscoverRefresh` (see docs/superpowers/specs/2026-09-05-home-discover-feed-design.md)
- `src/main/lib/jobs/` — durable job queue (pgmq-backed): `queries.ts`
  (enqueue/read/delete/archive/purge), `handlers.ts` (per-queue job logic),
  `worker.ts` (`enqueueAndProcess()` + periodic sweep). A finished job is
  deleted; only a job given up on is archived, and archives are truncated at
  launch — payloads carry `apiKey` and whole conversations. Decouples chat.ts's post-turn
  side effects (search indexing, LCM compaction, memory consolidation,
  `kb-sync`, `discover-refresh`) from the request/response cycle.
  `queries.ts`'s `enqueueJob` stamps the ambient `traceId` onto the payload
  (`__originTraceId`); `worker.ts` runs each handler in a `withTrace` linked
  to it
- `src/main/lib/logger/` — OpenTelemetry-shaped structured logging (no
  `@opentelemetry/*` dep): `record.ts` (LogRecord shape + severity/exception/
  legacy mapping), `resource.ts` (service/process identity), `trace-context.ts`
  (`AsyncLocalStorage` per-unit-of-work trace ids — `withTrace` /
  `currentTrace` / `bindTraceAttributes`), `index.ts` (the `logger` API,
  call signature unchanged). `withTrace` wraps the `/api/*` middleware, the
  job worker, and the scheduler. JSONL at `~/.exodus/logs/`; read via
  `/api/v1/logs` (filters incl. `traceId`) + `/api/v1/logs/scopes` and the
  Settings → Logger tab. See
  `docs/superpowers/specs/2026-09-06-standardized-logging-design.md`
- `src/main/lib/computer/` — window-scoped screenshot-loop Computer Use V0: the
  `exodus-input` Swift helper (list-windows / list-apps / screenshot / activate /
  CGEvent input), `capture`/`target`/`hands`/`guard`, `runComputerSession` (the
  perceive→act loop), `liveness` (the ⌥⇧⎋ kill switch); `target.resolveOrLaunch`
  opens an allowlisted app that isn't running. The inner-loop agent is
  `src/main/lib/ai/computer-use/`. Bound as the `computerUse` calling-tool,
  gated on `settings.computerUse.enabled`. `GET /api/v1/computer-use/apps` feeds the
  Settings allowlist picker. See
  `docs/superpowers/specs/2026-09-06-computer-use-v0-design.md`
- `src/main/lib/i18n.ts` — the main-process i18next instance (`mainI18n`),
  `resolveEffectiveLocale`, and the `get-app-locale` / `set-app-locale` IPC
- `src/main/lib/ipc.ts` — main-process IPC handlers
- `src/main/lib/lan/` — access from the LAN (exodus-ios on a device). The app is
  served twice (`server/app.ts`): plaintext on loopback, and over HTTPS on
  `LAN_SERVER_PORT` behind `authGate` — but only while a device is paired or a
  pairing window is open; until then nothing listens on the LAN at all.
  `pairing.ts` (the pairing window: a one-time code, two minutes, single use,
  five wrong guesses close it; pure, clock injected; also the
  `exodus://pair?h=&p=&c=&f=&n=` link and LAN host discovery), `devices.ts`
  (256-bit tokens stored as SHA-256 in `paired_device`; constant-time match
  through a cache every write drops, so a revocation bites on the next
  request), `certificate.ts` (self-signed P-256, ten years, key under
  `safeStorage` in `~/.exodus/tls/`; its fingerprint is what devices pin — never
  rotated except by "Reset all"), `listener.ts` (`sync()` makes the HTTPS
  listener match "wanted"; resolves once listening), `index.ts` (the process's
  `pairing`, `syncLan()`, `openPairingWindow()`). Routes: `POST /api/v1/pair`
  (code → token), `/api/v1/devices` (list, open/close a window, revoke, reset —
  loopback only). Spec:
  `docs/superpowers/specs/2026-09-20-lan-pairing-sandbox-isolation-design.md`
- `src/main/lib/artifact-protocol.ts` — the `exodus-artifact://sandbox` scheme
  the artifact sandbox is served from, so model-written code has an origin of
  its own and cannot reach `window.parent` (path-guarded static files when
  packaged; a proxy to the Vite dev server in dev)
- `src/main/lib/single-instance.ts` — the single-instance lock, taken by
  `db/db.ts` before it opens PGlite (see Data directory, ports and isolation)
- `src/main/lib/security.ts` — renderer hardening (`hardenRenderers()`:
  navigation guard, window-open handler, permission handler) and
  `openExternalSafely` / `isSafeExternalUrl`
- `src/main/lib/paths.ts` — `~/.exodus` path helpers

Preload:

- `src/preload/preload.ts` — context-isolated bridge (`preload.d.ts` types `window.electron` / `window.api`)

Renderer:

- `src/renderer/components/` — UI components
- `src/renderer/components/ui/` — shadcn primitives (reuse these)
- `src/renderer/components/lock/` — lock screen
- `src/renderer/components/philharmonic/` — Philharmonic UI
- `src/renderer/components/philharmonic/schedule/` — Schedule tab (agenda: upcoming one-off + recurring tasks)
- `src/renderer/components/settings/` — settings. Every page is put together
  from `settings-row.tsx` (`SettingsSection` — a titled card of hairline rows —
  and `SettingsRow`) plus `settings-kit.tsx`: `SettingsIntro` at the top (what the
  page is for, as muted prose — explanation gets no box; `SettingsNotice`, an
  `Alert`, is only for a caveat that must be heeded for the thing in front of
  the user to work, e.g. "same network" in the pairing steps), `SettingsItem` (icon tile + name + one line of meta +
  actions) for anything in a list and for a page's primary action,
  `SettingsEmpty` for an empty list, `SwapLabel` for a button whose label
  changes with state (stable width, blurred crossfade), and the motion tokens
  `ENTER` / `ENTER_UP` / `PAGE_ENTER` / `staggerDelay()` (`@starting-style`
  transitions — for what appears occasionally, never on a switch, a select or
  typing). A page reads top to bottom: intro, primary action, content
  sections, and anything destructive last in a section of its own, behind an
  `AlertDialog`. `settings-form.tsx` keys the page wrapper by tab so each page
  arrives with `PAGE_ENTER`
- `src/renderer/components/settings/settings-form/devices.tsx` — Settings →
  Integrations → Devices: pair a device by QR code, revoke, reset (the UI of
  `src/main/lib/lan/`). The pairing card is `devices-pairing.tsx`: an invitation,
  or — while a window is open — numbered steps beside the QR code and a
  countdown drawn from the shared `PAIRING_TTL_MS`
  (`packages/shared/src/constants/systems.ts`, enforced by the main process)
- `src/renderer/components/flag.tsx` — `<Flag code>`: a country flag as a
  separate SVG file by ISO code (never emoji — Windows has none; never inlined —
  the web-search list is 239 of them)
- `src/renderer/components/skills-market/` — Settings → Skills Market (Discover grid, detail page with audit + CLI command, Installed list)
- `src/renderer/containers/` — page-level components
- `src/renderer/stores/` — Jotai atoms
- `src/renderer/hooks/` — React hooks
- `src/renderer/services/` — API call wrappers
- `src/renderer/lib/` — renderer utilities (ipc, stream-manager, `tone.ts` — `data-tone` apply/boot cache, `mask-url.ts` — `maskUrlSecrets()` for showing a URL without its query-string credentials, `heatmap-months.ts` — month labels for the Profile heatmap)
- `src/renderer/components/tone-bridge.tsx` — follows `settings.colorTone` and re-applies it
- `src/renderer/sub-apps/` — searchbar, quick-chat, artifacts entry points

Shared:

- `packages/shared/src/types/` — cross-process types
- `packages/shared/src/constants/` — constants (`test-ids.ts`, `systems.ts`, `tool-names.ts`)
- `packages/shared/src/schemas/` — Zod schemas
- `packages/shared/src/utils/` — shared utilities
- `packages/shared/src/i18n/` — application i18n: `locales.ts` (the 10 locale IDs +
  `resolveLocale`), `namespaces.ts`, `index.ts` (`createI18n` — one i18next
  config for both processes, JSON catalogs lazy-loaded per locale),
  `catalog-audit.ts`, `types.d.ts` (typed `t()` keys), `locales/<id>/<ns>.json`.
  See `docs/superpowers/specs/2026-09-11-i18n-design.md`.

Tests & config:

- `tests/unit/` — Vitest unit tests, mirroring `src/` (`src/main/lib/paths.ts` → `tests/unit/main/lib/paths.test.ts`)
- `tests/api/` — API integration (Playwright)
- `tests/e2e/` — Electron E2E
- `tests/providers/` — provider compatibility
- `tests/fixtures/` — Playwright fixtures (electron, api-client)
- `tests/helpers/` — test helpers
- `tsconfig.test.json` — editor/type support for `tests/unit/**/*` (not part of the `bun run typecheck` gate)
- `forge.config.ts` — electron-forge config (packager, makers, publisher, Vite plugin, fuses)
- `vite.main.config.mts` / `vite.preload.config.mts` / `vite.renderer.config.mts` — Vite configs per target (the renderer one has the `data-testid` strip and the sub-app HTML entries)
- `vitest.config.ts` — unit test config
- `playwright.config.ts` — E2E config

Docs:

- `docs/superpowers/specs/` — design specs
- `docs/superpowers/plans/` — implementation plans
- `docs/security-hardening.md` — threat model, protections in place, and the
  open security items with their intended fixes
- `docs/pi-ai-review.md` — review of the pi-ai usage against the upstream
  README: what was fixed, and the migration to `@earendil-works/*` 0.85
  (done with the chat kernel, spec `2026-09-22-chat-kernel-design.md`)
- `docs/elasticsearch-setup.md` — end-user guide for configuring a
  self-hosted/cloud Elasticsearch cluster for Exodus's optional search
  upgrade (Exodus is consumer-only — never creates the index/mapping
  itself, see `src/main/lib/search/`)
- `docs/lightrag-setup.md` — end-user guide for running the self-hosted
  LightRAG server that backs the optional knowledge base (Exodus is a
  client only, see `src/main/lib/knowledge-base/`)
