# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Exodus is a cross-platform desktop AI chat application built with Electron, React, and Node.js. It features multi-provider LLM support, RAG (Retrieval-Augmented Generation), Deep Research, MCP (Model Context Protocol) integration, and a sophisticated memory/personalization layer.

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
pnpm lint             # Run ESLint with caching
pnpm format           # Format all files with Prettier
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
   - Runs Hono HTTP server on `localhost:3000`
   - Initializes PGlite database with pgvector extension
   - Connects to MCP servers on startup
   - Handles auto-updates

2. **Renderer Process** (`src/renderer/`):
   - React 19 application with React Router v7
   - Communicates with main process via HTTP (localhost:3000)
   - Uses Jotai for global state management
   - SWR for server state fetching
   - Contains three entry points: main app, searchbar, quick-chat

3. **Preload Process** (`src/preload/`):
   - Provides secure bridge between renderer and Electron APIs
   - Context isolation enabled
   - Exposes limited API surface to renderer

### Backend Server Architecture

The main process runs a **Hono HTTP server** that handles all business logic:

**Server Routes** (`src/main/lib/server/routes/`):

- `/api/chat` - Chat streaming, message search, MCP tool listing
- `/api/history` - Chat history CRUD operations
- `/api/setting` - User settings management
- `/api/audio` - Audio processing (TTS/STT)
- `/api/rag` - RAG document upload, retrieval, pagination
- `/api/deep-research` - Deep research execution with SSE progress updates
- `/api/tools` - Available tools listing
- `/api/db-io` - Database import/export
- `/api/workflow` - Workflow execution
- `/api/custom-uploader` - Custom file uploads

**Middleware Pipeline**:

1. CORS middleware (allows all origins for localhost development)
2. Tools middleware (injects MCP tools into context)
3. Error handler (returns JSON errors)

### Database Layer

**Database**: PGlite (embedded Postgres) with pgvector extension

- Location: `~/.app/Database` (in userData directory)
- ORM: Drizzle ORM with Zod schemas
- Schema: `src/main/lib/db/schema.ts`
- Migrations: `resources/drizzle/`

**Key Tables**:

- `chat` - Chat sessions (id, title, favorite, timestamps)
- `message` - Messages with parts/attachments (GIN indexed for full-text search)
- `vote` - User votes on messages
- `setting` - Global settings (models, API keys, preferences)
- `resource` - Knowledge base documents
- `embedding` - Vector embeddings for RAG (1536-dim, HNSW indexed)
- `deep_research` - Deep research jobs and results
- `deep_research_message` - Progress updates during research
- `memory` - User memory (preferences, goals, skills, environment)
- `session_summary` - Summarized conversation context
- `memory_usage_log` - Audit trail of memory usage

### AI/LLM Integration

**Multi-Provider Support** (via Vercel AI SDK v6):
All providers are in `src/main/lib/ai/providers/` and return:

```typescript
{
  provider: ProviderInstance
  chatModel: LanguageModel // for conversations
  reasoningModel: LanguageModel // for o1/claude reasoning models
  embeddingModel: EmbeddingModel // for RAG
}
```

Supported providers:

- OpenAI GPT (`anthropic-claude.ts`)
- Azure OpenAI (`azure-openai.ts`)
- Anthropic Claude (`anthropic-claude.ts`)
- Google Gemini (`google-gemini.ts`)
- xAI Grok (`xai-grok.ts`)
- Ollama (`ollama.ts` - local models)

**Chat Flow** (`src/main/lib/server/routes/chat.ts`):

1. Retrieve user settings (model selection, API keys)
2. Load chat history from database
3. Bind tools (built-in + MCP) based on `AdvancedTools` selection
4. Call `streamText()` from AI SDK with `maxSteps` for tool execution
5. Stream response back to renderer
6. On completion: save messages, evaluate memory write, generate session summary

**Tool Architecture** (`src/main/lib/ai/calling-tools/`):
Each tool is a Vercel AI SDK `tool()` with:

- Description for LLM understanding
- Zod schema for input validation
- Execute function

Built-in tools:

- `calculator.ts` - Mathematical expression evaluation
- `date.ts` - Date/time operations
- `weather.ts` - Weather lookup via Serper API
- `google-maps-places.ts` - Place search
- `google-maps-routing.ts` - Route calculation
- `image-generation.ts` - DALL-E integration
- `web-search.ts` - Web search via Serper API
- `rag.ts` - Knowledge base retrieval
- `deep-research.ts` - Trigger deep research

### RAG (Retrieval-Augmented Generation)

**Implementation** (`src/main/lib/ai/rag/`):

1. **Document Upload** (`loaders.ts`):
   - Supports PDF, Markdown, plain text
   - Uses LangChain loaders (PDFLoader, TextLoader)
   - Extracts content from uploaded files

2. **Text Chunking** (`splitters.ts`):
   - `RecursiveCharacterTextSplitter` breaks content into chunks
   - Configurable chunk size and overlap

3. **Embedding Generation** (`embeddings.ts`):
   - Converts chunks to 1536-dimensional vectors
   - Uses configured embedding model from provider settings
   - Stores vectors in `embedding` table with pgvector

4. **Retrieval** (during chat):
   - User question embedded via same model
   - Cosine similarity search against stored embeddings (HNSW index)
   - Top-4 relevant chunks returned
   - Context injected into chat for LLM

**API Endpoints**:

- `POST /api/rag` - Upload document
- `POST /api/rag/retrieve` - Search similar chunks
- `GET /api/rag` - List uploaded documents with pagination

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

**Memory System** (`src/main/lib/ai/agents/memory/`):

Tracks user preferences, goals, and context across conversations:

**Memory Types** (stored in `memory` table):

- `preference` - UI/interaction preferences
- `goal` - User objectives
- `environment` - Job, location, setup context
- `skill` - Expertise areas
- `project` - Current projects
- `constraint` - Limitations or rules

**Memory Operations**:

1. **Memory Write Judge** (`memory-write-judge.ts`):
   - Runs after each conversation
   - Uses gpt-4.1-mini to evaluate if memory should be written
   - Criteria: long-term stable (weeks+), multi-conversation useful, not sensitive
   - Output: shouldWrite boolean + memory metadata

2. **Memory Read Filter** (`memory-read-filter.ts`):
   - Before chat, filters relevant memories from database
   - Uses LLM to select only directly applicable memories
   - Prevents token waste and false positives

3. **Session Summary** (`session-summary.ts`):
   - After conversation, summarizes key points
   - Extracts: user goals, confirmed facts, open questions, preferences
   - Stored for future session context

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

- All API calls via `fetcher()` utility to `http://localhost:3000/api/*`
- Streaming responses handled via `streamText()` SDK
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

- All provider implementations must return `chatModel` and `reasoningModel`
- Use the shared `resolveModel()` from `src/main/lib/ai/providers/resolve-model.ts` — do NOT duplicate model resolution logic
- Provider-specific fallback defaults (contextWindow, maxTokens) are centralized in `PROVIDER_DEFAULTS` within `resolve-model.ts`
- Model names are retrieved from `setting` table
- API keys stored in settings (never hardcode)

### When Working with Database

- Always use Drizzle ORM queries (`src/main/lib/db/queries.ts`)
- Schema changes require running `pnpm db:generate` to create migrations
- Vector searches use `cosineDistance()` from pgvector
- All timestamps use `timestamp('created_at').notNull().defaultNow()`

### When Working with Tools

- Tool definitions go in `src/main/lib/ai/calling-tools/`
- Tools are bound conditionally based on `AdvancedTools` enum
- Always validate inputs with Zod schemas
- Tool descriptions are critical for LLM understanding
- Return structured data that LLM can interpret

### When Working with Chat

- Chat route handles streaming via `streamText()` from AI SDK
- Use `maxSteps` for multi-turn tool calling
- `mergeIntoDataStream()` adds reasoning/sources to stream
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

- Path aliases: `@shared` → `src/shared`, `@` → `src/renderer`
- Test files: `src/**/*.test.ts`
- Coverage: V8 provider targeting `src/shared/` and `src/main/lib/`

### Writing Tests

- Place test files next to the module they test: `foo.ts` → `foo.test.ts`
- Tests for main-process code that transitively imports Electron/PGlite must mock those modules:

```typescript
vi.mock('../../db/db', () => ({ pglite: {} }))
vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
```

- Use `await import('./module')` after mocks for dynamic import when needed

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
3. Implement execute function
4. Export as `tool()` from AI SDK
5. Add to tool binding logic in `src/main/lib/ai/utils/chat-message-util.ts`
6. Add UI toggle if needed in settings

### Adding a New Route

1. Create route file in `src/main/lib/server/routes/my-route.ts`
2. Define Hono route handlers
3. Import and register in main server setup
4. Create corresponding service in `src/renderer/services/my-service.ts`
5. Use SWR hook for data fetching in components

### Adding a New Provider

1. Create provider file in `src/main/lib/ai/providers/my-provider.ts`
2. Return `{ provider, chatModel, reasoningModel, embeddingModel }`
3. Add provider enum to `src/shared/constants/`
4. Update settings UI to include new provider
5. Update schema validation in `src/shared/schemas/`
