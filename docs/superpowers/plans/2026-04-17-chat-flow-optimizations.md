# Chat Flow Optimizations — Checklist

> Reference: [pi-mono/packages/ai](https://github.com/badlogic/pi-mono/tree/main/packages/ai)

---

### 1. Context Overflow Detection ✅

- [x] Add overflow regex patterns for all providers (OpenAI, Anthropic, Google, xAI, Azure, Ollama)
- [x] Add silent overflow detection: `inputTokens + cacheReadTokens > model.contextWindow` when `stopReason === "stop"`
- [x] Map overflow errors to user-friendly message in `chat-errors.ts`

**Files:** `src/main/lib/ai/utils/overflow.ts` (new), `src/main/lib/server/routes/chat-errors.ts`

---

### 2. Parallelize Memory Loading & LCM Assembly ✅

- [x] Wrap LCM context assembly, `loadRelevantMemories()`, user message save, and MCP tools fetch in `Promise.all`
- [x] Merge results after all complete for system prompt assembly

**Files:** `src/main/lib/server/routes/chat.ts`

---

### 3. Cross-Provider Message Normalization ✅

- [x] Normalize tool call IDs across providers (OpenAI long IDs → Anthropic-compatible `[a-zA-Z0-9_-]{1,64}`)
- [x] Filter thinking blocks (redacted removed, non-empty converted to text)
- [x] Auto-resolve orphaned tool calls with synthetic error results
- [x] Filter messages with error/aborted stopReason from history
- [x] Integrated into chat.ts `convertToLlm` replacing inline thinking block stripping

**Files:** `src/main/lib/ai/utils/transform-messages.ts` (new), `src/main/lib/server/routes/chat.ts`

---

### 4. Reuse LcmManager Instance ✅

- [x] Create single `LcmManager` instance before streaming
- [x] Reuse same instance for post-chat compaction logic (no second `new LcmManager`)

**Files:** `src/main/lib/server/routes/chat.ts`

---

### 5. Cost Tracking ✅

- [x] Calculate cost using pi-ai's `Model.cost` rates (input/output/cacheRead/cacheWrite per 1M tokens)
- [x] Include `CostBreakdown` in `ChatAssistantMessage` type and SSE `message_end` event
- [x] Add `calculateCost()` utility

**Files:** `src/main/lib/ai/utils/cost.ts` (new), `src/shared/types/chat.ts`, `src/main/lib/server/routes/chat.ts`

---

### 6. Async User Message Save ✅

- [x] Move `saveMessages` to run in parallel with LCM + memory assembly via `Promise.all`
- [x] Message ID already generated before stream so FK consistency is maintained

**Files:** `src/main/lib/server/routes/chat.ts`

---

### 7. MCP Tool Cache TTL ✅

- [x] Add 5-minute TTL to `mcpCache` entries via `cachedAt` timestamp
- [x] On cache expiry, close stale connection and re-fetch tools from MCP server
- [x] Existing `invalidateMcpCache()` / `invalidateAllMcpCache()` already handle settings changes

**Files:** `src/main/lib/ai/mcp.ts`

---

### 8. Typed Streaming Events ✅

- [x] Added `tool_call_start` and `tool_call_end` events to `ChatSseEvent` union
- [x] Emit `tool_call_start` on `tool_execution_start` from agentLoop
- [x] Emit `tool_call_end` after tool result message is sent

**Files:** `src/shared/types/chat.ts`, `src/main/lib/server/routes/chat.ts`

---

### 9. Tool Argument Validation ✅

- [x] Add runtime validation with type coercion for MCP tool arguments
- [x] Field-level error descriptions logged as warnings
- [x] Graceful fallback: log warning and pass coerced args through
- [x] Integrated into MCP tool execution in `mcp.ts`

**Files:** `src/main/lib/ai/utils/tool-validation.ts` (new), `src/main/lib/ai/mcp.ts`

---

### 10. Provider Lazy Loading — Skipped (not needed)

Provider modules are trivial wrappers around `resolveModel()`. Lazy loading adds complexity without meaningful benefit in Electron's bundled main process. Exported `ProviderResult`/`ProviderFn` types for reuse instead.

**Files:** `src/main/lib/ai/providers/index.ts`
