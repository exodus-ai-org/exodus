# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Exodus is a cross-platform desktop AI chat application built with Electron, React, and Node.js. It features multi-provider LLM support, a knowledge base (RAG), Deep Research, Philharmonic (multi-agent Groups), MCP (Model Context Protocol) routes, an app lock, lossless context management (LCM), and a memory/personalization layer.

## Project Constraints (read first)

These rules are mandatory. Some are automated (noted); the rest are conventions
you must uphold.

- **Tests + checkpoints with UI.** When adding a key interactive element, add a
  `TEST_IDS` entry (`src/shared/constants/test-ids.ts`) + `data-testid`, and
  reference it from a Playwright test. Test ids are a durable contract — never
  rename or regenerate an existing id. _Enforced by `test-ids.linkage.test.ts`._
- **Pre-commit gate.** Before committing, `pnpm format` → `pnpm lint` →
  `pnpm typecheck` → `pnpm test` must pass. _Enforced by the husky pre-commit
  hook._ Do not `--no-verify` except for the known flaky PGlite WASM teardown in
  `src/main/lib/ai/context-management/index.test.ts`.
- **Reuse UI primitives.** Prefer existing `@/components/ui` (shadcn) components
  over hand-rolled equivalents (e.g. shadcn `Select`, `InputOTP`).
- **Copy language.** New user-facing strings default to English.
- **Keep this file current.** Any change to architecture, routes, or directory
  structure updates CLAUDE.md in the same change. _Partly enforced by
  `claude-md-freshness.test.ts` (paths) and `claude-md-staleness.test.ts`
  (retired claims)._
- **Models & providers.** Use the shared `resolveModel()`
  (`src/main/lib/ai/providers/resolve-model.ts`); selectable model lists live in
  `src/shared/constants/models.ts`.

## Development Commands

### Running the Application

```bash
pnpm dev              # Start development server with hot reload
pnpm start            # Preview built application
```

### Building

```bash
pnpm build            # Build for development (runs typecheck first)
pnpm build:mac        # Build macOS application
pnpm build:linux      # Build Linux application
pnpm build:win        # Build Windows application
pnpm build:unpack     # Build without packaging (for testing)
```

### Code Quality

```bash
pnpm typecheck        # Run TypeScript checks for both node and web
pnpm typecheck:node   # Check main process code only
pnpm typecheck:web    # Check renderer process code only
pnpm lint             # Run oxlint (replaces ESLint, ~50-100x faster)
pnpm lint:fix         # Run oxlint with auto-fix
pnpm format           # Format all files with oxfmt (replaces Prettier, ~30x faster)
pnpm format:check     # Check formatting without modifying files
```

### Testing

```bash
pnpm test             # Run all unit tests with Vitest
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with V8 coverage report
```

### Database

```bash
pnpm db:generate      # Generate Drizzle migrations from schema
```

### Other

```bash
pnpm asar:sniff       # Inspect built ASAR archive
pnpm shadcn:generate  # Generate shadcn/ui component documentation
```

## Architecture

### Electron Process Model

Exodus uses a three-process architecture:

1. **Main Process** (`src/main/index.ts`):
   - Manages Electron app lifecycle, window creation, and IPC
   - Runs Hono HTTP server on `localhost:60223` (constant `SERVER_PORT` in `src/shared/constants/systems.ts`)
   - Initializes PGlite database with pgvector extension
   - MCP server connection is archived (commented out in `app.ts`); an `/api/mcp` route + settings remain
   - Handles auto-updates

2. **Renderer Process** (`src/renderer/`):
   - React 19 application with React Router v7
   - Communicates with main process via HTTP (localhost:60223)
   - Uses Jotai for global state management
   - SWR for server state fetching
   - Entry points: main app plus the sub-apps searchbar, quick-chat, artifacts

3. **Preload Process** (`src/preload/`):
   - Provides secure bridge between renderer and Electron APIs
   - Context isolation enabled
   - Exposes limited API surface to renderer

### Backend Server Architecture

The main process runs a **Hono HTTP server** that handles all business logic:

**Server Routes** (`src/main/lib/server/routes/`, registered in `src/main/lib/server/app.ts`):

`/api/chat`, `/api/lcm`, `/api/history`, `/api/project`, `/api/settings`, `/api/audio`, `/api/db-io`, `/api/deep-research`, `/api/tools`, `/api/philharmonic`, `/api/s3`, `/api/skills`, `/api/mcp`, `/api/memory`, `/api/usage`, `/api/logs`, `/api/backup`, `/api/artifacts`.

**Middleware Pipeline** (order in `app.ts`):

1. CORS middleware (`hono/cors`, allows all origins for localhost development)
2. Lock gate (`lockGate`) — rejects all `/api/*` with `423` while the app is locked
3. Settings injection — fresh `getSettings()` set on the Hono context per request
4. Error handler (`app.onError`, returns JSON errors)

The MCP-tools middleware (injecting MCP tools into context) is **archived** (commented out in `app.ts`).

### Database Layer

**Database**: PGlite (embedded Postgres) with pgvector extension

- Location: `~/.exodus/database` (`getDatabaseDir` in `src/main/lib/paths.ts`)
- ORM: Drizzle ORM with Zod schemas
- Schema: `src/main/lib/db/schema.ts`
- Migrations: `resources/drizzle/`

**Key Tables**:

- `settings` - Global settings (models, API keys, preferences)
- `knowledge_doc` - Knowledge base documents + vector embeddings (RAG)
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
All providers are in `src/main/lib/ai/providers/`. Each provider file resolves a `Model` via the shared `resolveModel()` in `src/main/lib/ai/providers/resolve-model.ts` (do not duplicate model-resolution logic). Per-provider fallback defaults (contextWindow, cost) live in `resolve-model.ts`; model lists live in `src/shared/constants/models.ts`.

Supported providers (files in `src/main/lib/ai/providers/`):

- OpenAI GPT (`openai-gpt.ts`)
- Azure OpenAI (`azure-openai.ts`)
- Anthropic Claude (`anthropic-claude.ts`)
- Google Gemini (`google-gemini.ts`)
- xAI Grok (`xai-grok.ts`)
- Ollama (`ollama.ts` - local models)

**Chat Flow** (`src/main/lib/server/routes/chat.ts`):

1. Retrieve user settings (model selection, API keys)
2. Load chat history from database
3. Bind built-in tools based on `AdvancedTools` selection
4. Stream via `agentLoop` from `@mariozechner/pi-agent-core` for multi-step tool execution
5. Stream response back to renderer
6. On completion: save messages; enqueue background jobs (search indexing,
   LCM compaction, memory-write judge, session summary) onto the pgmq-backed
   job queue (`src/main/lib/jobs/`) rather than running them inline

**Tool Architecture** (`src/main/lib/ai/calling-tools/`):
Each tool has a description for LLM understanding, a Zod input schema, and an execute function.

Built-in tools (files in `src/main/lib/ai/calling-tools/`):

`create-artifact`, `deep-research`, `edit-file`, `find-files`, `grep`, `image-generation`, `lcm-describe`, `lcm-expand`, `lcm-grep`, `list-directory`, `map-itinerary`, `read-file`, `terminal`, `weather`, `web-fetch`, `web-search`, `write-file`.

### Knowledge Base (RAG)

A knowledge-base layer backs RAG. Documents are chunked and embedded into the `knowledge_doc` pgvector table; cosine-similarity retrieval surfaces relevant chunks. DB access goes through `src/main/lib/db/knowledge-queries.ts`. Philharmonic agents query the knowledge base via `kb-tools.ts` in `src/main/lib/ai/philharmonic/`.

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

Tracks user preferences, goals, and context across conversations. Key functions: `runMemoryWriteJudge()`, `loadRelevantMemories()`, `formatMemoriesForSystem()`, `saveSessionSummary()`.

**Memory Types** (stored in `memory` table):

- `preference` - UI/interaction preferences
- `goal` - User objectives
- `environment` - Job, location, setup context
- `skill` - Expertise areas
- `project` - Current projects
- `constraint` - Limitations or rules

**Memory Operations** (all in `src/main/lib/ai/memory/manager.ts`):

1. **Memory Write Judge** (`runMemoryWriteJudge()`):
   - Runs after each conversation
   - Uses an LLM to evaluate if memory should be written
   - Criteria: long-term stable (weeks+), multi-conversation useful, not sensitive
   - Output: shouldWrite boolean + memory metadata

2. **Memory Read Filter** (`loadRelevantMemories()` / `formatMemoriesForSystem()`):
   - Before chat, filters relevant memories from database
   - Selects only directly applicable memories to avoid token waste

3. **Session Summary** (`saveSessionSummary()`):
   - After conversation, summarizes key points
   - Stored for future session context

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

**Main Process** (`tsconfig.node.json`):

- `@shared` → `src/shared`

**Renderer Process** (`tsconfig.web.json`):

- `@` → `src/renderer`
- `@shared` → `src/shared`

**Shared Code** (`src/shared/`):

- `types/` - Shared TypeScript types
- `constants/` - Constants used across processes
- `utils/` - Utility functions
- `schemas/` - Zod schemas
- `errors/` - Custom error classes

## Important Implementation Notes

### When Working with AI Providers

- Providers resolve a `Model` (from `@mariozechner/pi-ai`) via the shared `resolveModel()` in `src/main/lib/ai/providers/resolve-model.ts` — do NOT duplicate model resolution logic
- Per-provider fallback defaults (contextWindow, cost) are centralized in `resolve-model.ts`
- Model lists live in `src/shared/constants/models.ts`
- Model names/API keys are retrieved from settings (never hardcode)

### When Working with Database

- Always use Drizzle ORM queries (`src/main/lib/db/queries.ts`)
- Schema changes require running `pnpm db:generate` to create migrations
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
- Toast notifications via `sonner` library

### Security Considerations

- Context isolation enabled in preload
- API keys stored locally in PGlite database
- No external authentication (local-first application)
- CORS allows localhost only in development
- Sandbox disabled (required for native modules)

## Testing

### Framework

Vitest v4 with the following configuration (`vitest.config.ts`):

- Path aliases: `@shared` → `src/shared`, `@main` → `src/main`, `@` → `src/renderer`
- Test files: `tests/unit/**/*.test.ts`
- Coverage: V8 provider targeting `src/shared/` and `src/main/lib/`

### Writing Tests

- Tests live under `tests/unit/`, mirroring the source tree: `src/main/lib/paths.ts` → `tests/unit/main/lib/paths.test.ts`. Test files are never co-located with the module they test — this keeps `src/` free of test files. A dedicated `tsconfig.test.json` (referenced from the root `tsconfig.json`) covers `tests/unit/**/*` for editor support; it is intentionally not part of the `pnpm typecheck` gate.
- Import the module under test via the matching alias (`@main/...`, `@/...`, or `@shared/...`), not a relative path — relative paths would need to reach back out of `tests/unit/` into `src/`.
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

1. Install dependencies: `pnpm install`
2. Start dev server: `pnpm dev`
3. The app will launch with hot reload enabled
4. Database automatically initialized on first run
5. Configure at least one AI provider in settings before chatting

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

1. Create provider file in `src/main/lib/ai/providers/my-provider.ts`
2. Resolve a `Model` via the shared `resolveModel()` (`src/main/lib/ai/providers/resolve-model.ts`)
3. Add the provider's models to `src/shared/constants/models.ts`
4. Update settings UI to include the new provider
5. Update schema validation in `src/shared/schemas/`

### Test-ID Checkpoints (traceability)

When adding or generating an interactive element that warrants test coverage:

1. Add a semantic id to `src/shared/constants/test-ids.ts` (the value mirrors the
   object path, camelCase → kebab-case), e.g. `TEST_IDS.lock.unlockButton` →
   `'lock.unlock-button'`.
2. Apply it on the element: `data-testid={TEST_IDS.lock.unlockButton}`. For the
   `PinInput` (and similar wrapped components), pass the `testId` prop instead.
3. Reference the same constant from a Playwright test in `tests/` via
   `getByTestId(TEST_IDS.lock.unlockButton)`. (Playwright does not resolve the
   `@shared` alias — import `TEST_IDS` via a relative path in specs.)

Rules enforced by the Vitest linkage test `test-ids.linkage.test.ts` (runs in
`pnpm test` and the pre-commit hook):

- every registry id must be applied in `src/renderer` (no orphan ids),
- every registry id must be referenced by at least one test (no uncovered ids),
- never use a raw string `data-testid="..."` — always go through the registry.

Ids are a durable contract: never rename or regenerate an existing id; only add
new ones. Dangling references to non-existent ids are caught by TypeScript (the
registry is typed). `data-testid` attributes are stripped from packaged release
builds by a small Vite `transform` plugin in `electron.vite.config.ts` gated on
`STRIP_TEST_IDS=1` (set in `build:mac`/`build:win`/`build:linux`); dev and E2E
builds keep the markers.

## Code Structure

Main process:

- `src/main/index.ts` — app bootstrap, lifecycle, IPC + server startup
- `src/main/lib/server/app.ts` — Hono server + route registration
- `src/main/lib/server/routes/` — API route handlers
- `src/main/lib/server/middlewares/` — CORS, lock gate, error handler
- `src/main/lib/ai/providers/` — LLM provider resolution (`resolve-model.ts`)
- `src/main/lib/ai/calling-tools/` — built-in agent tools
- `src/main/lib/ai/philharmonic/` — multi-agent Groups
- `src/main/lib/ai/context-management/` — LCM
- `src/main/lib/ai/memory/` — memory + session summary
- `src/main/lib/lock/` — app lock (PIN, gate, idle)
- `src/main/lib/db/` — Drizzle schema + queries (PGlite)
- `src/main/lib/search/` — pluggable full-text search (PGlite default,
  optional Elasticsearch — see `resolveSearchProvider()`)
- `src/main/lib/jobs/` — durable job queue (pgmq-backed): `queries.ts`
  (enqueue/read/archive), `handlers.ts` (per-queue job logic), `worker.ts`
  (`enqueueAndProcess()` + periodic sweep); decouples chat.ts's post-turn
  side effects (search indexing, LCM compaction, memory-write judge,
  session summary) from the request/response cycle
- `src/main/lib/ipc.ts` — main-process IPC handlers
- `src/main/lib/paths.ts` — `~/.exodus` path helpers

Preload:

- `src/preload/index.ts` — context-isolated bridge

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

- `src/shared/types/` — cross-process types
- `src/shared/constants/` — constants (`models.ts`, `test-ids.ts`, `systems.ts`)
- `src/shared/schemas/` — Zod schemas
- `src/shared/utils/` — shared utilities

Tests & config:

- `tests/unit/` — Vitest unit tests, mirroring `src/` (`src/main/lib/paths.ts` → `tests/unit/main/lib/paths.test.ts`)
- `tests/api/` — API integration (Playwright)
- `tests/e2e/` — Electron E2E
- `tests/providers/` — provider compatibility
- `tests/fixtures/` — Playwright fixtures (electron, api-client)
- `tests/helpers/` — test helpers
- `tsconfig.test.json` — editor/type support for `tests/unit/**/*` (not part of the `pnpm typecheck` gate)
- `electron.vite.config.ts` — build config (incl. `data-testid` strip)
- `vitest.config.ts` — unit test config
- `playwright.config.ts` — E2E config

Docs:

- `docs/superpowers/specs/` — design specs
- `docs/superpowers/plans/` — implementation plans
- `docs/elasticsearch-setup.md` — end-user guide for configuring a
  self-hosted/cloud Elasticsearch cluster for Exodus's optional search
  upgrade (Exodus is consumer-only — never creates the index/mapping
  itself, see `src/main/lib/search/`)
