# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands

- `pnpm dev` - Start development server with hot reload
- `pnpm typecheck` - Type check both main process and renderer (runs both commands below)
- `pnpm typecheck:node` - Type check main process (tsconfig.node.json)
- `pnpm typecheck:web` - Type check renderer process (tsconfig.web.json)
- `pnpm lint` - Run ESLint with caching
- `pnpm format` - Format code with Prettier

### Build Commands

- `pnpm build` - Type check and build all processes (main/preload/renderer)
- `pnpm build:mac` - Build macOS application (.dmg)
- `pnpm build:win` - Build Windows application (.exe)
- `pnpm build:linux` - Build Linux application
- `pnpm build:unpack` - Build without packaging (for debugging)

### Database Commands

- `pnpm db:generate` - Generate Drizzle ORM client from schema changes

### Utility Commands

- `pnpm start` - Preview production build
- `pnpm asar:sniff` - Inspect asar archive contents
- `pnpm shadcn:generate` - Generate shadcn UI component text files

## Architecture Overview

### Project Structure

```
exodus/
├── src/
│   ├── main/              # Electron main process (Node.js)
│   │   ├── index.ts       # Entry point: DB migration, server startup, window creation
│   │   ├── lib/
│   │   │   ├── ai/        # LLM providers, tools, MCP, deep research
│   │   │   ├── db/        # PGlite database + Drizzle ORM schema and queries
│   │   │   ├── server/    # Hono HTTP server (port 3938)
│   │   │   ├── server-orpc/ # ORPC server (port 63129)
│   │   │   ├── window.ts  # Window management (main, search, quick chat)
│   │   │   └── ipc.ts     # IPC event handlers
│   ├── renderer/          # React UI (web frontend)
│   │   ├── components/    # React components
│   │   ├── stores/        # Jotai atoms (global state)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API client functions
│   │   ├── sub-apps/      # Separate entry points (searchbar, quick-chat)
│   │   └── index.html     # Main app entry
│   ├── preload/           # IPC bridge between main and renderer
│   └── shared/            # Cross-process types, constants, utilities
├── drizzle/               # Database migrations
└── resources/             # Static assets (icons, etc.)
```

### Technology Stack

**Core Framework:**

- Electron 37 (desktop app shell)
- React 19 + React Router 7 (UI)
- TypeScript (strict mode)

**State Management:**

- Jotai (atomic state)
- Key atoms: `advancedToolsAtom`, `attachmentAtom`, `activeDeepResearchIdAtom`

**Database:**

- PGlite (PostgreSQL in browser, offline-capable)
- Drizzle ORM (type-safe queries, no codegen)
- pgvector extension (vector embeddings for RAG)

**API Layer:**

- Hono (HTTP server on port 60223)
- ORPC (structured RPC on port 63129)
- Vercel AI SDK (streaming, tool calling)

**LLM Integration:**

- Vercel AI SDK with multiple providers (OpenAI, Claude, Gemini, Grok, Ollama, Azure)
- Model Context Protocol (MCP) for extensible tools

**UI Components:**

- Shadcn UI + Radix UI primitives
- Tailwind CSS 4 (utility-first styling)
- Framer Motion (animations)

### Multi-Process Architecture

**Main Process** (`src/main/`):

- Database initialization and migrations
- HTTP/ORPC server management
- Window lifecycle (main window, search bar, quick chat)
- IPC handlers for cross-process communication
- MCP server connections (child processes via stdio)

**Renderer Process** (`src/renderer/`):

- React-based UI
- Communicates with main via IPC and HTTP (localhost:60223)
- Three separate apps built from different entry points:
  - Main chat UI (`index.html`)
  - Search bar overlay (`sub-apps/searchbar/index.html`)
  - Quick chat widget (`sub-apps/quick-chat/index.html`)

**Preload Scripts** (`src/preload/`):

- Secure bridge exposing limited APIs to renderer
- IPC communication helpers

### Path Aliases

- `@/` → `src/renderer/` (renderer code only)
- `@shared/` → `src/shared/` (available in both main and renderer)

## Key Features Implementation

### Chat System

**Data Flow:**

```
User Input (React)
  → POST /api/chat with { id, messages, advancedTools }
  → Validate request body (createChatSchema)
  → Check if chat exists, if not: generateTitleFromUserMessage()
  → saveMessages() for user message
  → getModelFromProvider() → chatModel or reasoningModel
  → Select model based on advancedTools (Reasoning/DeepResearch uses reasoningModel)
  → streamText() with:
      - system prompt (systemPrompt or deepResearchBootPrompt)
      - maxSteps from settings
      - tools from bindCallingTools()
  → Stream response via Vercel AI data stream protocol
  → onFinish: saveMessages() for assistant response
  → useChat() hook updates UI in real-time
```

**Chat Hook Pattern:**

```typescript
const { messages, handleSubmit, input, setInput, append, stop } = useChat({
  api: `${BASE_URL}/api/chat`,
  id: chatId,
  body: { advancedTools },
  onFinish: () => mutate('/api/history')
})
```

**Message Structure:**

Messages contain `parts` (array of text/images) and optional `experimental_attachments`:

```typescript
{
  id: string,
  chatId: string,
  role: 'user' | 'assistant' | 'tool',
  parts: Array<TextPart | ImagePart>,
  attachments: Attachment[],
  createdAt: Date
}
```

### Database Schema

**Core Tables:**

- `Chat` - Chat sessions (id, title, createdAt, favorite)
- `Message` - Messages with JSON parts and attachments (GIN full-text search index)
- `Vote` - Message upvotes/downvotes
- `Setting` - User configuration (providers, API keys, MCP servers)
- `DeepResearch` - Research job tracking
- `Resource` - RAG knowledge bases
- `Embedding` - Vector embeddings (pgvector with HNSW index)
- `Memory` - Agent memory (preferences, goals, skills, constraints)

**Key Queries** (`src/main/lib/db/queries.ts`):

- `saveChat()`, `saveMessages()`, `getMessagesByChatId()`
- `fullTextSearchOnMessages()` - Postgres full-text search using GIN index
- `findRelevantContent()` - Vector similarity search for RAG
- `createResource()` - Embed and store knowledge base content
- `getChatById()`, `deleteChatById()`, `updateChat()` - Chat management

**Full-Text Search:**

Messages have a GIN index on `parts` for fast full-text search:

```typescript
// In schema.ts:
index('message_search_index').using(
  'gin',
  sql`to_tsvector('simple', ${table.parts})`
)

// Query via: GET /api/chat/search?query=your+search
```

### MCP (Model Context Protocol)

**Configuration:**
MCP servers are stored as JSON in `setting.mcpServers`:

```json
{
  "serverName": {
    "command": "/path/to/server",
    "args": ["--flag", "value"]
  }
}
```

**Connection Flow:**

1. `connectMcpServers()` reads config from database
2. Spawns each MCP server as child process via stdio transport
3. Discovers tools from each server
4. Tools added to Hono context: `c.set('tools', tools)`
5. Tools bound to LLM during chat via `bindCallingTools()` (in `src/main/lib/ai/utils/chat-message-util.ts`)

**Tool Binding:**

The `bindCallingTools()` function selectively enables tools based on `advancedTools`:

- If DeepResearch is enabled, only deepResearch tool is available
- Otherwise, combines: built-in tools (webSearch, weather, etc.) + MCP tools + RAG (if enabled)

**Hot Reload:**

When MCP config changes, send IPC message `restart-server` to restart HTTP server with new tools.

### LLM Provider System

**Provider Factory** (`src/main/lib/ai/providers/index.ts`):
Each provider exports `getProviderName(setting)` returning:

```typescript
{
  provider: ProviderInstance,
  chatModel: Model,
  reasoningModel: Model,
  embeddingModel: EmbeddingModel
}
```

**Model Selection:**

```typescript
const { chatModel, reasoningModel } = await getModelFromProvider()

// In streamText():
model: advancedTools.includes(AdvancedTools.Reasoning)
  ? reasoningModel
  : chatModel
```

**Supported Providers:**

- OpenAI GPT (gpt-4o, o1, o3-mini, o3, etc.)
- Azure OpenAI (same models as OpenAI)
- Anthropic Claude (claude-3-5-sonnet, claude-3-7-sonnet)
- Google Gemini (gemini-2.5-flash, gemini-2.5-pro)
- Xai Grok (grok-3-beta, grok-3-mini-beta)
- Ollama (user-defined local models)

### Deep Research

**Implementation** (`src/main/lib/ai/deep-research/`):

Recursive research algorithm:

1. Generate initial search queries from user's research goal
2. Execute web searches via Serper API
3. Extract learnings from results using LLM
4. Generate follow-up questions based on learnings
5. Recurse with reduced breadth/depth until exhausted
6. Compile final Markdown report with citations

**Progress Tracking:**

- Stores status updates in `DeepResearchMessage` table
- Frontend polls or streams updates via `deepResearchMessagesAtom`
- Progress types: `EmitSearchQueries`, `EmitSearchResults`, `EmitLearnings`

### RAG (Retrieval-Augmented Generation)

**Upload Flow:**

```
Upload file → Split into chunks (CharacterTextSplitter)
  → Generate embeddings (configurable model)
  → Store in Resource + Embedding tables
  → Create pgvector HNSW index
```

**Query Flow:**

```
User question → Embed question
  → Similarity search (cosine > 0.5)
  → Top 4 relevant chunks
  → Include as context in LLM prompt
```

**Implementation:**

- `createResource()` - Chunk and embed documents
- `findRelevantContent()` - Similarity search
- Built-in tool: "SearchInKnowledgeBase"

### Built-in Calling Tools

Located in `src/main/lib/ai/calling-tools/`:

- **Web Search** - Google search via Serper API
- **Deep Research** - Multi-step research with recursive queries
- **RAG** - Search knowledge base with vector similarity
- **Weather** - Weather information via Serper
- **Google Maps** - Places and routing
- **Image Generation** - OpenAI DALL-E integration
- **Calculator** - Math expression evaluation
- **Date** - Current date/time

Each tool uses `ai.tool()` with Zod schema validation.

## Development Patterns

### Adding a New LLM Provider

1. Create file in `src/main/lib/ai/providers/new-provider.ts`
2. Export function matching signature:

```typescript
export function getNewProvider(setting: Setting) {
  const provider = createNewProvider({
    apiKey: setting.providers?.newProviderApiKey,
    baseURL: setting.providers?.newProviderBaseUrl  // Optional custom endpoint
  })
  return {
    provider,
    chatModel: provider(setting.providerConfig?.chatModel),
    reasoningModel: provider(setting.providerConfig?.reasoningModel),
    embeddingModel: provider.textEmbeddingModel(...)
  }
}
```

1. Add to provider factory in `src/main/lib/ai/providers/index.ts`:

```typescript
const providers = {
  // ...existing providers
  [AiProviders.NewProvider]: getNewProvider
}
```

1. Update `AiProviders` enum in `src/shared/constants/providers.ts`
2. Add provider schema in `src/shared/schemas/setting-schema.ts` (for API keys)
3. Add UI settings in `src/renderer/components/settings/`

### Adding a New Tool

1. Create tool definition in `src/main/lib/ai/calling-tools/new-tool.ts`:

```typescript
import { tool } from 'ai'
import { z } from 'zod'

export const newToolSchema = z.object({
  param1: z.string().describe('Clear description for LLM'),
  param2: z.number().optional().describe('Optional parameter')
})

export const newTool = tool({
  description:
    'Detailed description of what this tool does. The LLM uses this to decide when to call it.',
  parameters: newToolSchema,
  execute: async ({ param1, param2 }) => {
    // Implementation
    // Can be async, can throw errors, can return complex objects
    const result = await doSomething(param1, param2)
    return result // Return value sent back to LLM as context
  }
})
```

1. Export from `src/main/lib/ai/calling-tools/index.ts`:

```typescript
export { newTool } from './new-tool'
```

1. Import and add to `bindCallingTools()` in `src/main/lib/ai/utils/chat-message-util.ts`:

```typescript
import { calculator, date, newTool, ... } from '../calling-tools'

// In bindCallingTools():
return {
  calculator,
  date,
  newTool,
  ...mcpToolsMap,
  ...(advancedTools.includes(AdvancedTools.WebSearch) && { webSearch }),
  // ...
}
```

1. Optionally add to `AdvancedTools` enum if it should be user-toggleable

### Adding an API Route (ORPC)

**Note: New routes should use ORPC, not Hono. See ORPC_MIGRATION_COMPLETE.md for migration details.**

1. Create route file in `src/main/lib/server-orpc/routes/new-route.ts`:

```typescript
import { os } from '@orpc/server'
import { ErrorCode } from '@shared/constants/error-codes'
import { NotFoundError, ValidationError } from '@shared/errors'
import z from 'zod'

// Define input schema
const inputSchema = z.object({
  id: z.string(),
  data: z.string()
})

// Define route
export const getItem = os.input(inputSchema).handler(async ({ input }) => {
  const item = await getItemById(input.id)

  if (!item) {
    throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, 'Item not found', {
      id: input.id
    })
  }

  return item
})

// With middleware
export const createItem = os
  .use(withSetting)
  .input(inputSchema)
  .handler(async ({ input, context }) => {
    // context.setting available from middleware
    return await saveItem(input)
  })
```

2. Register in `src/main/lib/server-orpc/routes/index.ts`:

```typescript
import { getItem, createItem } from './new-route'

export const router = {
  // ... existing routes
  newRoute: {
    getItem,
    createItem
  }
}
```

3. Use proper error handling with error codes (see Error Handling section)

### Database Schema Changes

1. Modify `src/main/lib/db/schema.ts`
2. Run `pnpm db:generate` to create migration
3. Migration runs automatically on next app start
4. Update TypeScript types (auto-inferred from schema)

### State Management with Jotai

**Atom Locations:**

- Chat-related: `src/renderer/stores/chat.ts`
- Settings: `src/renderer/stores/setting.ts`
- Workflow: `src/renderer/stores/workflow.ts`

**Common Atoms:**

```typescript
// Chat state
advancedToolsAtom // Selected tools (WebSearch, Reasoning, etc.)
attachmentAtom // File attachments for current message
activeDeepResearchIdAtom // Currently running deep research
deepResearchMessagesAtom // Streaming messages from research
isImmersionVisibleAtom // Code editor overlay toggle
isFullTextSearchVisibleAtom // Search modal visibility
toBeDeletedChatAtom // Chat pending deletion confirmation
renamedChatTitleAtom // Chat rename dialog state
availableMcpToolsAtom // MCP tools list
```

**Usage Pattern:**

```typescript
// Define atom in stores/
export const myAtom = atom<MyType>(initialValue)

// Read in component
const value = useAtomValue(myAtom)

// Write in component
const setValue = useSetAtom(myAtom)

// Read and write
const [value, setValue] = useAtom(myAtom)
```

**Best Practices:**

- Keep atoms focused and single-purpose
- Co-locate related atoms in same file
- Use TypeScript types for atom values
- Prefer `useAtomValue`/`useSetAtom` over `useAtom` when only reading or writing

## Build Configuration

### Vite Build

**Config:** `electron.vite.config.ts`

Three separate bundles:

- **main** - Main process (Node.js target)
- **preload** - Preload scripts (contextBridge APIs)
- **renderer** - React UI with 3 entry points (main, searchbar, quickChat)

**Minification:** esbuild (fast, production-ready)

### Electron Builder

**Config:** `electron-builder.yml`

Platform-specific builds:

- macOS: .dmg installer
- Windows: .exe installer
- Linux: AppImage, deb, rpm

**Auto-updater:** Electron Updater checks GitHub Releases for updates

## Important Notes

### TypeScript Configuration

Two separate tsconfigs:

- `tsconfig.node.json` - Main process (includes main/, preload/, shared/)
- `tsconfig.web.json` - Renderer process (includes renderer/, shared/)

Both must pass for successful build.

### IPC Communication

**From Renderer to Main:**

```typescript
// In renderer
window.electronAPI.sendIPCMessage('event-name', data)

// In main (ipc.ts)
ipcMain.on('event-name', (event, data) => { ... })
```

**From Main to Renderer:**

```typescript
// In main
mainWindow.webContents.send('event-name', data)

// In renderer
window.electronAPI.onIPCMessage('event-name', (data) => { ... })
```

### Security Considerations

- Context isolation enabled (preload scripts required)
- Node integration disabled in renderer
- Developer tools always enabled (transparency principle)
- API keys stored in local PGlite database (not in code)

### HTTP Server Ports

- **Hono HTTP Server:** `localhost:60223` (SERVER_PORT constant)
- **ORPC Server:** `localhost:63129`

These are defined in `src/shared/constants/systems.ts`. The BASE_URL constant is `http://localhost:${SERVER_PORT}`.

### Code Style

- Prettier with custom config (single quotes, no semicolons, 80 char width)
- ESLint with React and TypeScript rules
- Organize imports plugin (auto-sort imports)
- Pre-commit hooks via Husky + lint-staged

### API Routes Reference

**Chat Routes** (`/api/chat`):

- `POST /api/chat` - Stream chat completion
- `GET /api/chat/:id` - Load chat messages
- `DELETE /api/chat/:id` - Delete chat
- `PUT /api/chat` - Update chat (title, favorite)
- `GET /api/chat/search?query=...` - Full-text search messages
- `GET /api/chat/mcp` - List available MCP tools

**Other Routes:**

- `GET /api/history` - List all chats
- `GET /api/setting`, `POST /api/setting` - Manage user settings
- `POST /api/deep-research` - Start deep research job
- `POST /api/rag` - Upload knowledge base content
- `GET /api/tools` - List available tools
- `POST /api/audio` - Text-to-speech
- `POST /api/custom-uploader` - Upload to S3/custom storage
- `POST /api/db-io/export`, `POST /api/db-io/import` - Database export/import
- `/api/workflow/*` - Workflow execution routes

### Model Configuration

**maxSteps:**

Controls how many tool-calling iterations the LLM can make:

- Default: 1 (single response)
- Higher values: Allow LLM to call multiple tools sequentially
- Configured in Settings → Provider Config
- Used in `streamText()` call

**Model Selection Logic:**

```typescript
// In chat route handler:
const model =
  advancedTools.includes(AdvancedTools.Reasoning) ||
  advancedTools.includes(AdvancedTools.DeepResearch)
    ? reasoningModel // o1, o3-mini, claude-3-7-sonnet, etc.
    : chatModel // gpt-4o, claude-3-5-sonnet, etc.
```

**System Prompts:**

- Standard chat: `systemPrompt` (in `src/main/lib/ai/prompts.ts`)
- Deep research: `deepResearchBootPrompt`
- Title generation: `titleGenerationPrompt`

## Common Tasks

### Running Tests

No formal test suite. Validation through:

1. `pnpm typecheck` - Catch type errors
2. `pnpm lint` - Code quality checks
3. `pnpm dev` - Manual smoke testing

### Debugging

**Main Process:**

- Add `console.log()` statements
- View logs in terminal running `pnpm dev`

**Renderer Process:**

- Use browser DevTools (Cmd+Option+I on macOS)
- React DevTools available in development

**Database:**

- Query via `src/main/lib/db/queries.ts` functions
- Use PGlite's SQL interface directly if needed

### Hot Reload Behavior

- **Renderer changes:** Instant hot reload (React Fast Refresh)
- **Main process changes:** Requires Electron restart (automatic with electron-vite)
- **Shared type changes:** Both processes reload

### Working with Embeddings

When modifying RAG:

- Embedding dimensions must match model (stored in DB schema)
- Similarity threshold: 0.5 (adjustable in queries)
- HNSW index rebuilds automatically on schema changes
- Use `js-tiktoken` for token counting before chunking

### MCP Server Development

When adding/testing MCP servers:

1. Configure in Settings → MCP Servers
2. Server spawned as child process on app startup
3. Tools discovered automatically via MCP protocol
4. Restart server via IPC message: `restart-server`
5. Check logs for connection errors

## Release Process

- Semantic Release on `master` branch
- Conventional Commits required (feat:, fix:, etc.)
- Automatic versioning and changelog generation
- GitHub Releases publishes binaries
- Electron Updater fetches updates automatically

## Important Conventions

### Naming Patterns

**Files:**

- React components: PascalCase (`ChatMessage.tsx`, `SettingsDialog.tsx`)
- Utilities/helpers: kebab-case (`chat-message-util.ts`, `web-search.ts`)
- Constants: kebab-case (`systems.ts`, `models.ts`)
- Types: kebab-case (`ai.ts`, `db.ts`)

**Functions:**

- Queries: verb + noun (`saveChat`, `getMessagesByChatId`, `fullTextSearchOnMessages`)
- Providers: `get` + provider name (`getOpenAi`, `getAnthropicClaude`)
- Tools: noun or verb (`calculator`, `webSearch`, `deepResearch`)
- React hooks: `use` prefix (`useChat`, `useAtomValue`)

**Types:**

- Database models: Same as table name (`Chat`, `Message`, `Setting`)
- Enums: PascalCase (`AiProviders`, `AdvancedTools`)
- Interfaces/Types: PascalCase (`Variables`, `McpTools`)

### Error Handling

**⚠️ Important: Exodus uses a standardized error code system. See `ERROR_HANDLING_GUIDE.md` for complete documentation.**

**In ORPC Routes:**

```typescript
import { ErrorCode } from '@shared/constants/error-codes'
import { NotFoundError, ConfigurationError } from '@shared/errors'

// Throw specific error with error code
if (!chat) {
  throw new NotFoundError(ErrorCode.CHAT_NOT_FOUND, undefined, { chatId: id })
}

if (!embeddingModel) {
  throw new ConfigurationError(ErrorCode.CONFIG_MISSING_EMBEDDING_MODEL)
}
```

**Available Error Classes:**

- `ConfigurationError` - Missing or invalid configuration
- `NotFoundError` - Resource not found (404)
- `ValidationError` - Invalid input (400)
- `ServiceError` - External service failures (503)
- `DatabaseError` - Database operation failures (500)
- `FileError` - File operation failures (500)
- `AIError` - AI/Model errors (500)
- `InternalError` - Internal server errors (500)

**In Renderer (Client-Side):**

```typescript
import { parseAPIError } from '@shared/types/api-error'
import { ErrorCode } from '@shared/constants/error-codes'

try {
  await orpcClient.chat.stream(data)
} catch (error) {
  const apiError = parseAPIError(error)

  // Handle specific error codes
  if (apiError.is(ErrorCode.CONFIG_MISSING_CHAT_MODEL)) {
    toast.error('Please configure a chat model in settings')
    router.push('/settings')
    return
  }

  // Handle error categories
  if (apiError.isConfigError()) {
    router.push('/settings')
  }

  // Show user-friendly message
  toast.error(apiError.getUserMessage())
}
```

**Key Files:**

- `src/shared/constants/error-codes.ts` - All error codes and messages
- `src/shared/errors/` - Error class definitions
- `src/shared/types/api-error.ts` - Client-side error handling utilities
- `ERROR_HANDLING_GUIDE.md` - Complete documentation

### Schema Validation

All API request bodies should use Zod schemas:

```typescript
// Define in src/main/lib/server/schemas.ts
export const createChatSchema = z.object({
  id: z.string(),
  messages: z.array(messageSchema),
  advancedTools: z.array(z.nativeEnum(AdvancedTools))
})

// Validate in route handler
const result = createChatSchema.safeParse(await c.req.json())
if (!result.success) {
  return c.text('Invalid request body', 400)
}
```

### Streaming Patterns

**Server-Side (Vercel AI SDK):**

```typescript
const dataStream = createDataStream({
  execute: async (dataStream) => {
    const result = streamText({
      model,
      messages,
      tools,
      onFinish: async ({ response }) => {
        // Post-processing after stream completes
      }
    })
    result.mergeIntoDataStream(dataStream)
  }
})

return stream(c, async (stream) => {
  for await (const chunk of dataStream) {
    await stream.write(chunk)
  }
})
```

**Client-Side:**

```typescript
// Vercel AI SDK's useChat handles streaming automatically
const { messages } = useChat({
  api: '/api/chat',
  streamProtocol: 'data' // Uses Vercel AI data stream format
})
```

### Database Patterns

**Transactions:**

```typescript
// Drizzle ORM transactions
await db.transaction(async (tx) => {
  await tx.insert(chat).values(newChat)
  await tx.insert(message).values(messages)
})
```

**Type-Safe Queries:**

```typescript
// Auto-inferred types from schema
const chats = await db.select().from(chat).where(eq(chat.favorite, true))
// chats: Chat[]
```

**JSON Columns:**

```typescript
// Use jsonb() with $type for type safety
providerConfig: jsonb('providerConfig').$type<
  z.infer<typeof providerConfigSchema>
>()
```

### Component Organization

```
components/
├── ui/                 # shadcn/ui components (Button, Dialog, etc.)
├── chat/              # Chat-specific components
├── settings/          # Settings-specific components
├── workflow/          # Workflow-specific components
└── [feature]/         # Other feature-specific components
```

### Import Organization

Prettier with `prettier-plugin-organize-imports` automatically sorts:

1. React imports
2. External packages
3. Internal absolute imports (`@/`, `@shared/`)
4. Relative imports
5. Type imports (if using `import type`)

No need to manually organize - just run `pnpm format`.
