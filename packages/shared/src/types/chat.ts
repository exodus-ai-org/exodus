import type {
  AssistantMessage,
  ImageContent,
  TextContent,
  ThinkingContent,
  ToolCall,
  ToolResultMessage,
  Usage,
  UserMessage
} from '@earendil-works/pi-ai'

import type { UsedMemory } from './memory'

export type {
  AssistantMessage,
  ImageContent,
  TextContent,
  ThinkingContent,
  ToolCall,
  ToolResultMessage,
  Usage,
  UserMessage
}

export interface CostBreakdown {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  total: number
}

/**
 * Every message carries the run it belongs to: the id of the run's user
 * message (which is its own `runId`). One run = one user message and every
 * model step and tool result that answered it; the renderer groups by it and
 * the database indexes it (`message.runId`).
 */
export type ChatUserMessage = UserMessage & {
  id: string
  runId: string
  /** Regenerate groups (spec 2026-09-26): the group's first run, on every
   *  run a Regenerate created; null/absent on an ordinary run. */
  alternateOf?: string | null
  /** Where this run stands in its regenerate group; null/absent for an
   *  ordinary run. Set only by the server. */
  attempt?: Attempt | null
}

/**
 * A regenerate group's run state, on its user row: `comparing` (one of the
 * two answers shown side by side), `chosen` (the one kept), `folded` (the
 * other one, behind "1 other version"), `hidden` (older than the newest two:
 * never shown, never sent to the model).
 */
export type Attempt = 'comparing' | 'chosen' | 'folded' | 'hidden'
export type ChatAssistantMessage = AssistantMessage & {
  id: string
  runId: string
  cost?: CostBreakdown
  /** Wall-clock duration of the entire turn this message belongs to. Set only
   * on the LAST assistant message of a turn by the server (chat route) so the
   * UI can show an accurate "Worked for X seconds" without relying on message
   * timestamps (which mark stream start, not end). */
  durationMs?: number
}
export type ChatToolResultMessage = ToolResultMessage & {
  id: string
  runId: string
}
export type ChatMessage =
  | ChatUserMessage
  | ChatAssistantMessage
  | ChatToolResultMessage

export type Attachment = {
  name: string
  url: string
  contentType: string
}

/**
 * A non-fatal condition a tool wants the user to know about — e.g. an expired
 * API key that only degraded enrichment, so the tool still returned a result.
 * A tool opts in by putting one on its `details` (`{ ..., notice }`); the chat
 * route relays it as a `notice` SSE event and specific tool cards may also
 * render it inline.
 */
export type ToolNoticeLevel = 'warning' | 'info'
export interface ToolNotice {
  level: ToolNoticeLevel
  message: string
}

/**
 * `image_generation`'s `details`: what the card shows. `url` is an https URL
 * (DALL·E, valid for an hour) or a `data:` URL (GPT image models only return
 * base64) — the model is told only the count and the revised prompts, never
 * the bytes. Rows saved before 2026-09-25 may carry an image with no `url`.
 */
/**
 * One generated image as `image_generation` records it: saved under
 * `~/.exodus/media/<chatId>/<mediaId>` and served by
 * `GET /api/v1/media/<chatId>/<mediaId>`. `chatId` is absent for a
 * Philharmonic Group's image (saved, never served).
 */
export interface GeneratedImage {
  /** The file name, `<uuid>.png|jpg|webp`. */
  mediaId: string
  chatId?: string
  mimeType: string
  width?: number
  height?: number
  revisedPrompt?: string
}

/**
 * A row written before images were saved to disk: a base64 `data:` URL
 * (24665d84) or a DALL·E link that expired an hour after it was made.
 */
export interface LegacyGeneratedImage {
  url?: string
  revisedPrompt?: string
}

export interface ImageGenerationDetails {
  images: Array<GeneratedImage | LegacyGeneratedImage>
  /** The `size` the request asked for (e.g. `1024x1536`, `auto`). */
  size?: string
}

// SSE event types for streaming protocol
export type ChatSseEvent =
  | { type: 'message_update'; message: ChatMessage }
  | { type: 'tool_call_start'; toolCallId: string; toolName: string }
  | {
      type: 'tool_call_end'
      toolCallId: string
      toolName: string
      isError: boolean
    }
  | { type: 'done'; messages: ChatMessage[] }
  | { type: 'title'; title: string }
  | { type: 'error'; error: string }
  | { type: 'notice'; level: ToolNoticeLevel; message: string }
  // Which memories were selected into this run's system prompt, sent once
  // right after the stream opens (before any kernel event). A client that
  // doesn't know this event type ignores it (exodus-ios).
  | { type: 'memories_used'; runId: string; memories: UsedMemory[] }
  // A tool call that touches a secret outside Exodus is paused until the
  // user answers (`POST /api/v1/chat/approval`). `summary` is the path or
  // command, never file contents; `expiresAt` (epoch ms) is when it is
  // declined unanswered. Unknown to exodus-ios so far, which ignores it.
  | ApprovalRequiredEvent
  // How that paused call was settled — by the user here or on another
  // client, by the timeout, or by Stop.
  | {
      type: 'approval_resolved'
      runId: string
      toolCallId: string
      outcome: ApprovalOutcome
    }

/** How a paused call ended. Anything but `allowed` declines it. */
export type ApprovalOutcome = 'allowed' | 'denied' | 'timed_out' | 'stopped'

export interface ApprovalRequiredEvent {
  type: 'approval_required'
  runId: string
  toolCallId: string
  toolName: string
  /** Sanitized, cut at 8000 characters when longer (`truncated` / `hiddenChars`
   *  say so) — never at the shorter bound the model's own declined-access
   *  text uses, so the card shows more than the model ever needs to. */
  summary: string
  /** Present (`true`) only when `summary` was cut. */
  truncated?: boolean
  /** Present only when `truncated`: how many sanitized characters were cut. */
  hiddenChars?: number
  expiresAt: number
}

// ─── Chat UI Types ─────────────────────────────────────────────────────────

import type { WebSearchResult } from './web-search'

export type ChatStatus = 'idle' | 'submitted' | 'streaming' | 'error'

export type ChatTab = { id: string; title: string }

export interface SendMessageOptions {
  text?: string
  attachments?: Attachment[]
}

export interface TimelineStep {
  type: 'thinking' | 'toolCall' | 'toolResult'
  text: string
  isError?: boolean
  toolName?: string
  webSearchResults?: WebSearchResult[]
  // Longer, code-shaped argument (e.g. a shell command) rendered as a
  // monospace block below `text` instead of inline — keeps the timeline row
  // compact while still showing the full command.
  codeArgument?: string
}

/**
 * A run that failed after the prompt was accepted: the provider's error, shown
 * at the foot of that run's message. Not persisted — the steps that completed
 * are, the failure is not — so it lives only for the session.
 */
export interface RunError {
  runId: string
  message: string
}

/**
 * One piece of a run's answer, top to bottom: a stretch of the model's text,
 * or the card of a tool it called, placed where the call was made. Keys hold
 * while the run streams — blocks are only added at the end, and the last text
 * grows in place.
 */
export type TurnBlock =
  | { kind: 'text'; key: string; text: string }
  | {
      kind: 'tool'
      /** The call's id. */
      key: string
      toolName: string
      /** Absent until the tool has answered. */
      result?: ChatToolResultMessage
    }
  | {
      kind: 'image'
      /** The call's id. */
      key: string
      /** The prompt from the call's arguments ('' while it still streams). */
      prompt: string
      result?: ChatToolResultMessage
    }

/**
 * One run as the renderer shows it: a timeline of steps above the answer's
 * blocks.
 */
export interface AssistantTurn {
  runId: string
  messages: ChatMessage[]
  steps: TimelineStep[]
  /** The answer in the run's own order: text, a card, text… */
  blocks: TurnBlock[]
  /**
   * Every assistant text block of the run, in order, joined as paragraphs —
   * what Copy, read-aloud and the Sources panel take as "the answer".
   */
  body: string
  /** Timestamp of the last assistant message (stream start). */
  timestamp: number
  pendingToolCalls: Array<{
    name: string
    id: string
    arguments?: Record<string, unknown>
  }>
  toolCards: ChatToolResultMessage[]
  durationMs: number
  hasContent: boolean
  webSearchResults: WebSearchResult[]
}

/**
 * A regenerate group as the renderer shows it (spec 2026-09-26): the question
 * once, and under it the answers on show — two side by side while they are
 * compared, the chosen one after, with the other behind "1 other version".
 */
export interface CompareSegment {
  type: 'compare'
  /** The group's first run. */
  groupId: string
  /** The question, as the first answer on show asked it. */
  question: ChatMessage
  /** The answers on show, the earlier first: two while comparing, else one. */
  columns: AssistantTurn[]
  /** The answer that was not chosen. */
  folded: AssistantTurn | null
  /** A later run exists: the choice can no longer move. */
  locked: boolean
  /** Every message of the group's runs, in order: what this was built from. */
  messages: ChatMessage[]
}

export type Segment =
  | { type: 'user'; message: ChatMessage }
  | { type: 'assistantTurn'; turn: AssistantTurn }
  | CompareSegment
