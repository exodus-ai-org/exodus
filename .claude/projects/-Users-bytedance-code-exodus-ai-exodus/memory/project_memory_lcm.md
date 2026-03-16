---
name: Memory + LCM implementation
description: Details of the Memory Layer and LCM (Lossless Context Management) system added to Exodus
type: project
---

Implemented a full Memory Layer + LCM system. Key facts:

**Why:** User wanted LCM (from lossless-claw / Voltropy paper) + proper user memory management.

**DB migration:** `0006_memory_lcm.sql` adds 4 new LCM tables (lcm_summary, lcm_summary_messages, lcm_summary_parents, lcm_context_items) and `memoryLayer` JSONB column to Setting.

**LCM location:** `src/main/lib/ai/context-management/`

- index.ts → LcmManager class (per-chat, with promise queue for concurrent safety)
- compaction.ts → leaf + condensed summarization with 3-level fallback
- context-assembler.ts → assembles Message[] from LCM context items
- prompts.ts → 4 depth-aware summarization prompts
- queries.ts → all Drizzle queries for LCM tables
- token-counter.ts → char/3.5 approximation

**LCM Tools:** `src/main/lib/ai/calling-tools/lcm-{grep,describe,expand}.ts`

- These are for Agent use only; NOT added to chat tool bindings yet
- lcm-expand takes (model, apiKey) factory pattern since it needs to call LLM

**Memory Manager:** `src/main/lib/ai/memory/manager.ts`

- LOCAL_USER_ID = '00000000-0000-0000-0000-000000000001' (single-user constant)
- runMemoryWriteJudge, loadRelevantMemories, formatMemoriesForSystem, saveSessionSummary

**Memory queries:** `src/main/lib/db/memory-queries.ts`

**API route:** `src/main/lib/server/routes/memory.ts` → `/api/memory` CRUD

**Settings schema:** `MemoryLayerSchema` in setting-schema.ts:

- autoWrite, lcmEnabled, contextWindowPercent (50-95, default 75), freshTailSize (8-64, default 16)

**Frontend:** `src/renderer/services/memory.ts` + full `memory-layer.tsx` UI with memory list/edit/delete + LCM config.

**How to apply:** When working on Agent X or complex agent features, LCM tools (lcm-grep/describe/expand) can be added to agent tool lists. The LcmManager can be instantiated with any chatId.
