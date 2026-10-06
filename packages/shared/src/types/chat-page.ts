import type { Attempt } from './chat'

/**
 * `GET /api/v1/chat/:id/page` (spec 2026-10-01 §C3): a chat's history a page
 * at a time. See `src/main/lib/chat/page.ts`.
 */

/** A stored message row as a page carries it: `GET /api/v1/chat/:id`'s shape, compacted. */
export interface ChatPageRow {
  id: string
  runId: string
  role: string
  content: unknown
  usage?: unknown
  api?: string | null
  provider?: string | null
  model?: string | null
  stopReason?: string | null
  errorMessage?: string | null
  toolCallId?: string | null
  toolName?: string | null
  details?: unknown
  isError?: boolean | null
  durationMs?: number | null
  alternateOf?: string | null
  attempt?: Attempt | null
  /** An ISO string on the wire. */
  createdAt: Date | string
  /** Cut to fit a page: `GET /api/v1/chat/:id/messages/:messageId` has it whole. */
  truncated?: boolean
}

/** A numbered source of the chat, without its text (`recall` reads that). */
export interface ChatPageSource {
  rank: number
  link: string
  title: string
  /** The run that found it: a rank resolves to the newest source before the citing run. */
  runId: string
  siteName?: string
  hostname?: string
  favicon?: string
  snippet?: string
  thumbnail?: string
  age?: string
}

/** One question of the chat, for the outline: a regenerate group's once. */
export interface ChatPageQuestion {
  runId: string
  /** At most 200 characters. */
  text: string
  /** Epoch milliseconds. */
  createdAt: number
}

export interface ChatPage {
  messages: ChatPageRow[]
  sources: ChatPageSource[]
  questions: ChatPageQuestion[]
  hasOlder: boolean
  /** Pass as `before` for the next older page; null when there is none. */
  olderCursor: string | null
}
