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
bun run make             # Build installers/archives (Squirrel, ZIP, deb, rpm); strips data-testid (STRIP_TEST_IDS=1)
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
bun run test:e2e:electron  # Playwright Electron E2E (packages first: it drives the production build in .vite/)
bun run test:e2e:api       # Playwright API integration (needs a running app + .env.test)
bun run test:e2e:providers # Provider compatibility (needs API keys in .env.test)
```

### Database

```bash
bun run db:generate      # Generate Drizzle migrations from schema
```

### Other

```bash
bun run knip             # Find unused files/exports/dependencies
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
   - MCP server connection is archived (commented out in `app.ts`); an `/api/mcp` route + settings remain
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
   - Exposes `window.electron` (`ipcRenderer.{send,invoke,on,once,removeListener,removeAllListeners}` + `process`, the same nested shape as `@electron-toolkit/preload`'s `electronAPI`, reimplemented without the dependency) and `window.api` (`os`, `locale`)

### Data directory, ports and isolation

Exodus is the successor of the older `universal-client` app and shares its
`~/.exodus` layout, so a dev build sees the same chats, settings and memories:

- **Data dir**: `~/.exodus` for packaged _and_ unpackaged runs (`bun run start`,
  `electron .`) — `getExodusHome()` in `src/main/lib/paths.ts`; startup logs the
  directory in use (`Data directory`). **PGlite is single-process: never run two
  Exodus processes (a dev build, the packaged app, universal-client) against it
  at the same time** — the database can be corrupted (backups live in
  `~/.exodus/backups`). `EXODUS_HOME` points a run at another directory.
- **Electron `userData`**: the default `~/Library/Application Support/Exodus`
  for every build — it only holds Chromium state (localStorage, caches) and is
  where the legacy-location migration looks. There is no `-dev` variant of
  anything.
- **Server port**: `SERVER_PORT = 60223` (`packages/shared/src/constants/systems.ts`)
  — the port `exodus-ios` (and any other client of this backend) connects to, so
  don't change it without updating them.
- **E2E**: `playwright.config.ts` points `$HOME` at a scratch dir
  (`<tmpdir>/exodus-e2e-home`); the electron fixture wipes `~/.exodus` under it
  before every test and throws at import unless `$HOME` is that dir. To test a
  packaged build by hand, sandbox `$HOME` and pass `--user-data-dir` the same way.

### Skills (deprecated)

The skills marketplace (backend `/api/skills`, install/search flows, and the
Settings → Skills Market UI) is deprecated and was not migrated. Only a seam
remains: `src/main/lib/ai/skills/skills-manager.ts` exports the three functions
live code still calls (`listInstalledSkills`, `getSkillsContentBySlugs`,
`getActiveSkillsContent`) and returns "no skills"; the settings nav entry shows
a placeholder. The replacement plugs in there.

### Migration status

`docs/migration-plan.md` records how the business code was ported from
universal-client and every place it deliberately diverges (React Compiler left
off, seven oxlint style rules downgraded to warnings, auto-updater state machine
rebuilt on `update-electron-app`, …). Read it before changing build/packaging code.

### Backend Server Architecture

The main process runs a **Hono HTTP server** that handles all business logic:

**Server Routes** (`src/main/lib/server/routes/`, registered in `src/main/lib/server/app.ts`):

`/api/chat`, `/api/lcm`, `/api/history`, `/api/knowledge-base`, `/api/project`, `/api/settings`, `/api/audio`, `/api/db-io`, `/api/deep-research`, `/api/discover`, `/api/tools`, `/api/philharmonic`, `/api/s3`, `/api/mcp`, `/api/memory`, `/api/usage`, `/api/logs`, `/api/backup`, `/api/artifacts`, `/api/computer-use`.

The `/api/settings` route includes `POST /api/settings/models` — dispatches to the appropriate list-models handler based on the provider in the request body, reading the API key from the request (not from saved settings) to fetch live model catalogs.

**Middleware Pipeline** (order in `app.ts`):

1. CORS middleware (`hono/cors`, allows all origins for localhost development)
2. Lock gate (`lockGate`) — rejects all `/api/*` with `423` while the app is locked
3. Trace gate (`traceMiddleware`) — wraps each `/api/*` request in an `AsyncLocalStorage` trace (see `src/main/lib/logger/`), sets the `x-trace-id` response header
4. Settings injection — fresh `getSettings()` set on the Hono context per request
5. Error handler (`app.onError`, returns JSON errors)

The MCP-tools middleware (injecting MCP tools into context) is **archived** (commented out in `app.ts`).

### Database Layer

**Database**: PGlite (embedded Postgres) with pgvector extension

- Location: `~/.exodus/database` (`getDatabaseDir` in `src/main/lib/paths.ts`)
- ORM: Drizzle ORM with Zod schemas
- Schema: `src/main/lib/db/schema.ts`
- Migrations: `resources/drizzle/`

**Key Tables**:

- `settings` - Global settings (models, API keys, preferences)
- `knowledge_doc` - Knowledge base source documents + per-doc LightRAG sync status
- `deep_research` / `deep_research_message` - Deep research jobs and progress updates
- `memory` / `memory_usage_log` - User memory and audit trail
- `session_summary` - Summarized conversation context
- `project` - Projects
- `mcp_server` - Configured MCP servers
- `lcm_summary` - Lossless context-management summaries
- Philharmonic: `agent`, `agent_memory`, `team`, `task`, `task_execution`, `task_execution_event`, `conversation_plan`, `plan_step`

The full chat/message tables and indexes are defined in `src/main/lib/db/schema.ts`.

### AI/LLM Integration

**Multi-Provider Support** (built on `@mariozechner/pi-ai` + `@mariozechner/pi-agent-core`):
All model resolution lives in `src/main/lib/ai/providers/`. The registry-backed
providers (OpenAI GPT, Azure OpenAI, Anthropic Claude, Google Gemini, xAI Grok)
are one `SPECS` table + a `fromSpec` factory in `index.ts` — a row only supplies
the base-URL setting, its fallback, the default model ids, and the pi-ai
`provider` / `api` strings. Ollama (`ollama.ts`) is the exception: a hand-built
`Model` with nothing in the registry. Every path resolves through the shared
`resolveModel()` in `resolve-model.ts` (do not duplicate model-resolution
logic); it accepts an optional live-fetched `snapshot` parameter (from
`POST /api/settings/models`) to override the pi-ai registry. Per-provider
fallback defaults (contextWindow, cost) and `MODEL_METADATA_FALLBACK` (narrower
scope: only what a provider's own list API omits) live there. Live model lists
are fetched per-provider from `src/main/lib/ai/providers/list-models/`.

**Chat Flow** (`src/main/lib/server/routes/chat.ts`):

1. Retrieve user settings (model selection, API keys)
2. Load chat history from database
3. Bind built-in tools based on `AdvancedTools` selection
4. Stream via `agentLoop` from `@mariozechner/pi-agent-core` for multi-step tool execution
5. Stream response back to renderer
6. On completion: save messages; enqueue background jobs (search indexing,
   LCM compaction, memory consolidation) onto the pgmq-backed
   job queue (`src/main/lib/jobs/`) rather than running them inline

**Tool Architecture** (`src/main/lib/ai/calling-tools/`):
Each tool has a description for LLM understanding, a Zod input schema, and an execute function.

Built-in tools (files in `src/main/lib/ai/calling-tools/`):

`computer-use`, `create-artifact`, `deep-research`, `edit-file`, `find-files`, `grep`, `image-generation`, `lcm-describe`, `lcm-expand`, `lcm-grep`, `list-directory`, `map-itinerary`, `read-file`, `search-knowledge-base`, `terminal`, `weather`, `web-fetch`, `web-search`, `write-file`.

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

> Note: automatic MCP server connection at startup is **archived** (`connectMcpServers()` is commented out in `app.ts`). The `/api/mcp` route and MCP settings remain. The flow below describes the intended/legacy behavior.

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
- Route: `/api/philharmonic`
- Each Group gets an isolated workspace under `~/.exodus/groups`
- Scheduled tasks (`task.cronExpression` for recurring, `task.runAt` for
  one-off) run via `src/main/lib/ai/philharmonic/scheduler.ts`
  (per-task `node-cron` jobs + a once-a-minute sweep for one-off tasks);
  managed from the Schedule tab on the Dashboard page
  (`components/philharmonic/schedule/`)

### App Lock

A local PIN lock protects the app and gates all API access.

- Main process: `src/main/lib/lock/` (`lock-manager` state machine, `pin-store` using scrypt + Electron `safeStorage`, `idle-watcher`, `lock-config`, IPC handlers)
- The `lockGate` middleware rejects every `/api/*` request with `423` while locked
- Unlock happens only via IPC (the lock screen), never over HTTP
- The encrypted PIN secret lives at `~/.exodus/lock.dat`
- Renderer: `src/renderer/components/lock/`

### LCM (lossless context management)

Compacts long conversations without losing information, surfacing summaries the agent can expand or grep.

- Main process: `src/main/lib/ai/context-management/` (compaction, context assembler, token counter, status bus)
- Route: `/api/lcm`
- Related built-in tools: `lcm-describe`, `lcm-expand`, `lcm-grep`

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
- Streaming responses are consumed from the server's `agentLoop`-driven SSE/stream
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

- Providers resolve a `Model` (from `@mariozechner/pi-ai`) via the shared `resolveModel()` in `src/main/lib/ai/providers/resolve-model.ts` — do NOT duplicate model resolution logic
- `resolveModel()` accepts an optional `snapshot` parameter (live-fetched from `POST /api/settings/models`) to override the pi-ai registry
- Per-provider fallback defaults (contextWindow, cost) and `MODEL_METADATA_FALLBACK` are centralized in `resolve-model.ts`
- Model lists are now live-fetched per provider from Settings via `src/main/lib/ai/providers/list-models/`
- Model names/API keys are retrieved from settings (never hardcode)

### When Working with Database

- Always use Drizzle ORM queries (`src/main/lib/db/queries.ts`)
- Schema changes require running `bun run db:generate` to create migrations
- Vector searches use `cosineDistance()` from pgvector
- All timestamps use `timestamp('created_at').notNull().defaultNow()`

### When Working with Tools

- Tool definitions go in `src/main/lib/ai/calling-tools/`
- Tools are bound conditionally based on the `AdvancedTools` selection
- Always validate inputs with Zod schemas
- Tool descriptions are critical for LLM understanding
- Return structured data that the LLM can interpret

### When Working with Chat

- Chat route streams via `agentLoop` from `@mariozechner/pi-agent-core`
- `agentLoop` handles multi-turn tool calling internally
- Always save messages to database after completion
- Message parts stored as JSONB in `message.parts` column

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

- Context isolation enabled in preload
- API keys stored locally in PGlite database
- No external authentication (local-first application)
- CORS allows localhost only in development
- Sandbox disabled (required for native modules)

## Testing

### Framework

Vitest v4 with the following configuration (`vitest.config.ts`):

- Path aliases: `@main` → `src/main`, `@` → `src/renderer` (shared code is imported as `@exodus/shared/...` through the workspace package)
- Test files: `tests/unit/**/*.test.ts`
- Coverage: V8 provider targeting `packages/shared/src/` and `src/main/lib/`

### Writing Tests

- Tests live under `tests/unit/`, mirroring the source tree: `src/main/lib/paths.ts` → `tests/unit/main/lib/paths.test.ts`. Test files are never co-located with the module they test — this keeps `src/` free of test files. A dedicated `tsconfig.test.json` (referenced from the root `tsconfig.json`) covers `tests/unit/**/*` for editor support; it is intentionally not part of the `bun run typecheck` gate.
- Import the module under test via the matching alias (`@main/...`, `@/...`, or `@exodus/shared/...`), not a relative path — relative paths would need to reach back out of `tests/unit/` into `src/`.
- Tests for main-process code that transitively imports Electron/PGlite must mock those modules:

```typescript
vi.mock('@main/lib/db/db', () => ({ pglite: {} }))
vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
```

- Use `await import('@main/lib/paths')` (alias, not a relative path) after mocks for dynamic import when needed

### Shared Utilities

Reusable AI utilities that should be used (and tested) instead of inline implementations:

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
- `src/main/lib/server/middlewares/` — CORS, lock gate, error handler
- `src/main/lib/ai/providers/` — LLM provider resolution (`resolve-model.ts`)
- `src/main/lib/ai/providers/list-models/` — Live model catalog handlers per provider (`anthropic.ts`, `openai.ts`, `google.ts`, `xai.ts`, `ollama.ts`); each normalizes that provider's list-models API response into `{ id, displayName, snapshot: ModelSnapshot }`, dispatched by `index.ts` and called from `POST /api/settings/models`
- `src/main/lib/ai/calling-tools/` — built-in agent tools
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
  (enqueue/read/archive), `handlers.ts` (per-queue job logic), `worker.ts`
  (`enqueueAndProcess()` + periodic sweep); decouples chat.ts's post-turn
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
  `/api/logs` (filters incl. `traceId`) + `/api/logs/scopes` and the
  Settings → Logger tab. See
  `docs/superpowers/specs/2026-09-06-standardized-logging-design.md`
- `src/main/lib/computer/` — window-scoped screenshot-loop Computer Use V0: the
  `exodus-input` Swift helper (list-windows / list-apps / screenshot / activate /
  CGEvent input), `capture`/`target`/`hands`/`guard`, `runComputerSession` (the
  perceive→act loop), `liveness` (the ⌥⇧⎋ kill switch); `target.resolveOrLaunch`
  opens an allowlisted app that isn't running. The inner-loop agent is
  `src/main/lib/ai/computer-use/`. Bound as the `computerUse` calling-tool,
  gated on `settings.computerUse.enabled`. `GET /api/computer-use/apps` feeds the
  Settings allowlist picker. See
  `docs/superpowers/specs/2026-09-06-computer-use-v0-design.md`
- `src/main/lib/i18n.ts` — the main-process i18next instance (`mainI18n`),
  `resolveEffectiveLocale`, and the `get-app-locale` / `set-app-locale` IPC
- `src/main/lib/ipc.ts` — main-process IPC handlers
- `src/main/lib/paths.ts` — `~/.exodus` path helpers

Preload:

- `src/preload/preload.ts` — context-isolated bridge (`preload.d.ts` types `window.electron` / `window.api`)

Renderer:

- `src/renderer/components/` — UI components
- `src/renderer/components/ui/` — shadcn primitives (reuse these)
- `src/renderer/components/lock/` — lock screen
- `src/renderer/components/philharmonic/` — Philharmonic UI
- `src/renderer/components/philharmonic/schedule/` — Schedule tab (agenda: upcoming one-off + recurring tasks)
- `src/renderer/components/settings/` — settings
- `src/renderer/containers/` — page-level components
- `src/renderer/stores/` — Jotai atoms
- `src/renderer/hooks/` — React hooks
- `src/renderer/services/` — API call wrappers
- `src/renderer/lib/` — renderer utilities (ipc, stream-manager)
- `src/renderer/sub-apps/` — searchbar, quick-chat, artifacts entry points

Shared:

- `packages/shared/src/types/` — cross-process types
- `packages/shared/src/constants/` — constants (`test-ids.ts`, `systems.ts`)
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
- `docs/elasticsearch-setup.md` — end-user guide for configuring a
  self-hosted/cloud Elasticsearch cluster for Exodus's optional search
  upgrade (Exodus is consumer-only — never creates the index/mapping
  itself, see `src/main/lib/search/`)
- `docs/lightrag-setup.md` — end-user guide for running the self-hosted
  LightRAG server that backs the optional knowledge base (Exodus is a
  client only, see `src/main/lib/knowledge-base/`)
