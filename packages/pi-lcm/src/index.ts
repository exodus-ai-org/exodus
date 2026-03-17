// Init
export { initLcm } from './init'
export type { LcmConfig } from './init'

// Schema
export {
  lcmContextItems,
  lcmSummary,
  lcmSummaryMessages,
  lcmSummaryParents,
  memory,
  memorySourceEnum,
  memoryTypeEnum,
  memoryUsageLog,
  sessionSummary,
  type LcmContextItem,
  type LcmSummary
} from './schema'

// Context Management
export type { AssembledContext } from './context/assembler'
export { LcmManager } from './context/manager'

// Memory
export {
  LOCAL_USER_ID,
  formatMemoriesForSystem,
  loadRelevantMemories,
  runMemoryWriteJudge,
  saveSessionSummary
} from './memory/manager'
export {
  createMemory,
  getActiveMemories,
  getAllMemories,
  getMemoryById,
  getSessionSummary,
  hardDeleteMemory,
  logMemoryUsage,
  softDeleteMemory,
  updateMemory,
  upsertSessionSummary,
  type MemoryRow,
  type MemorySource,
  type MemoryType
} from './memory/queries'

// Tools
export { lcmDescribe } from './tools/describe'
export { lcmExpand } from './tools/expand'
export { lcmGrep } from './tools/grep'

// Token utilities
export { estimateMessageTokens, estimateTokens } from './context/token-counter'
