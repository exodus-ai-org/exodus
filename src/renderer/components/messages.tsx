import { TOOL_NAMES } from '@exodus/shared/constants/tool-names'
import type {
  AssistantTurn,
  ChatAssistantMessage,
  CompareSegment,
  ChatMessage,
  ChatStatus,
  ChatToolResultMessage,
  ImageContent,
  RunError,
  Segment,
  TextContent,
  TimelineStep,
  TurnBlock
} from '@exodus/shared/types/chat'
import type { WebSearchResult } from '@exodus/shared/types/web-search'
import { isLocked, runAttemptInfos } from '@exodus/shared/utils/attempts'
import { splitThinkingTagsInContent } from '@exodus/shared/utils/thinking-tags'
import { capitalCase } from 'change-case'
import { ArrowDownIcon } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useDiscoverFeed } from '@/hooks/use-discover-feed'
import { useSettings } from '@/hooks/use-settings'
import { i18n } from '@/lib/i18n'
import { ENTER_UP } from '@/lib/motion'
import { userMessageText } from '@/lib/user-message-text'
import { cn } from '@/lib/utils'

import { ZoomableAttachment } from './attachment-frame'
import { hasToolCard } from './calling-tools/tool-cards'
import { ChatToc } from './chat-toc'
import { AssistantTurnSegment } from './chat/assistant-turn-segment'
import { COMPARE_FRAME, CompareTurns } from './chat/compare-turns'
import { UserBubble } from './chat/user-bubble'
import { DiscoverFeed } from './home/discover-feed'
import { MessageSpinner, shouldShowMessageSpinner } from './message-spinner'

type MessagesProps = {
  chatId: string
  status: ChatStatus
  messages: ChatMessage[]
  regenerate: () => void
  /** Keeps one answer of a regenerate group (`useChooseAttempt`). */
  chooseAttempt: (runId: string) => void
  showDiscover?: boolean
  /** The run that failed last; its message shows the error at its foot. */
  runError?: RunError | null
}

const AT_BOTTOM_THRESHOLD = 80

/** Whether a run has an answer on screen, its own or in a comparison. */
function showsRun(segments: Segment[], runId: string): boolean {
  return segments.some((s) =>
    s.type === 'assistantTurn'
      ? s.turn.runId === runId
      : s.type === 'compare' && s.columns.some((turn) => turn.runId === runId)
  )
}

/** The questions on screen, in order: what the navigation rail lists. */
function questionsOf(segments: Segment[]): ChatMessage[] {
  const questions: ChatMessage[] = []
  for (const segment of segments) {
    if (segment.type === 'user') questions.push(segment.message)
    else if (segment.type === 'compare') questions.push(segment.question)
  }
  return questions
}

const UserSegment = memo(function UserSegment({
  message,
  fresh
}: {
  message: ChatMessage
  /** Sent during this visit (not loaded with the chat): it rises in. */
  fresh: boolean
}) {
  const { t } = useTranslation('chat')
  return (
    <div
      data-user-msg-id={message.id}
      className={cn(
        'mb-8 flex flex-col items-end first:mt-0 last:mb-4',
        fresh && ENTER_UP
      )}
    >
      {Array.isArray(message.content) &&
        message.content.some((c) => c.type === 'image') && (
          <div className="mb-4 flex gap-4">
            {(message.content as Array<TextContent | ImageContent>).map(
              (part) => {
                if (part.type === 'image') {
                  return (
                    // part.data is the base64 data URL, unique per image attachment
                    <ZoomableAttachment
                      key={part.data}
                      attachment={{ url: part.data, kind: 'image' }}
                    >
                      <img
                        className="max-h-96 max-w-64 rounded-lg object-cover"
                        src={part.data}
                        alt={t('messageList.attachmentAlt')}
                      />
                    </ZoomableAttachment>
                  )
                }
                return null
              }
            )}
          </div>
        )}
      <UserBubble text={userMessageText(message)} />
    </div>
  )
})

/**
 * Build a timeline preview for a tool call. Most tools get an inline
 * summary ("Web Search: <query>"); terminal commands get pulled out into a
 * separate monospace block so heredocs, pipes, and multi-line scripts stay
 * legible instead of collapsing into a single messy line.
 *
 * The raw tool name is the canonical identifier (used as the SSE event
 * key, the DB column, and the dispatch key in messages-calling-tools); we
 * format it for display only here, at the rendering boundary, via
 * capitalCase ('web_search' → 'Web Search').
 */
function getToolCallPreview(
  name: string,
  args: Record<string, unknown> | undefined
): { text: string; codeArgument?: string } {
  const label = capitalCase(name)
  if (!args) return { text: label }
  const pick = (key: string): string =>
    typeof args[key] === 'string' ? (args[key] as string) : ''

  switch (name) {
    case 'terminal': {
      const cmd = pick('command')
      return cmd ? { text: label, codeArgument: cmd } : { text: label }
    }
    case TOOL_NAMES.webSearch:
      return withInline(label, pick('query'))
    case TOOL_NAMES.webFetch:
      return withInline(label, pick('url'))
    case TOOL_NAMES.readFile:
    case TOOL_NAMES.writeFile:
    case TOOL_NAMES.editFile:
      return withInline(label, pick('path') || pick('filePath'))
    case 'weather':
      return withInline(label, pick('location'))
    case TOOL_NAMES.mapItinerary: {
      // Show "Map Itinerary: 3 days, 12 stops" so the timeline conveys the
      // scale of the itinerary the LLM just built.
      const days = Array.isArray(args.days) ? (args.days as unknown[]) : []
      const stops = days.reduce<number>((acc, d) => {
        const places = (d as { places?: unknown[] } | null)?.places
        return acc + (Array.isArray(places) ? places.length : 0)
      }, 0)
      // Days and stops pluralize independently, so each gets its own
      // CLDR-keyed lookup; the outer "{{days}}, {{stops}}" template composes
      // the two already-translated fragments (same technique
      // common.composer.reasoningPill already uses for its {{label}} param).
      // This is a plain helper (not a component or hook), so translated text
      // uses the shared `i18n` singleton directly rather than useTranslation().
      const dayCount = days.length
      const daysText = i18n.t('chat:toolPreview.mapItineraryDayCount', {
        count: dayCount
      })
      const stopsText = i18n.t('chat:toolPreview.mapItineraryStopCount', {
        count: stops
      })
      const summary = i18n.t('chat:toolPreview.mapItinerarySummary', {
        days: daysText,
        stops: stopsText
      })
      return withInline(label, summary)
    }
    default:
      return { text: label }
  }
}

function withInline(label: string, value: string): { text: string } {
  return { text: value ? `${label}: ${value}` : label }
}

type CardBlock = Exclude<TurnBlock, { kind: 'text' }>

/**
 * A turn's blocks as they are built: text goes to the text before it when
 * nothing with a card stands between them, and a card's place is where its
 * call was made — so a block is only ever added at the end, and a run that
 * called nothing with a card is one text, as it always was.
 */
function createBlocks() {
  const blocks: TurnBlock[] = []
  const cards = new Map<string, CardBlock>()
  let texts = 0

  const card = (block: CardBlock) => {
    blocks.push(block)
    cards.set(block.key, block)
  }

  return {
    blocks,
    text(text: string) {
      const last = blocks.at(-1)
      if (last?.kind === 'text') last.text += `\n\n${text}`
      else blocks.push({ kind: 'text', key: `text:${texts++}`, text })
    },
    call(id: string, name: string, args?: Record<string, unknown>) {
      if (name === TOOL_NAMES.imageGeneration) {
        const prompt = typeof args?.prompt === 'string' ? args.prompt : ''
        card({ kind: 'image', key: id, prompt })
      } else if (hasToolCard(name)) {
        card({ kind: 'tool', key: id, toolName: name })
      }
    },
    result(result: ChatToolResultMessage) {
      const { toolCallId: id, toolName } = result
      const held = cards.get(id)
      if (held?.kind === 'tool' && result.isError) {
        // A failed tool is a line of the timeline, not a card.
        blocks.splice(blocks.indexOf(held), 1)
      } else if (held) {
        held.result = result
      } else if (toolName === TOOL_NAMES.imageGeneration) {
        // A result whose call the run does not hold: a row from before calls
        // were kept. Its card goes where the result arrived.
        card({ kind: 'image', key: id, prompt: '', result })
      } else if (!result.isError && hasToolCard(toolName ?? '')) {
        card({ kind: 'tool', key: id, toolName, result })
      }
    }
  }
}

/**
 * A run's assistant/toolResult messages as one turn: thinking and tools as a
 * timeline above the answer — its text and its tools' cards, in run order.
 */
function buildAssistantTurn(
  runId: string,
  turnMessages: ChatMessage[]
): AssistantTurn {
  const steps: TimelineStep[] = []
  const texts: string[] = []
  const answer = createBlocks()
  let timestamp = 0
  const pendingToolCalls: AssistantTurn['pendingToolCalls'] = []
  const toolCards: ChatToolResultMessage[] = []
  const webSearchResults: WebSearchResult[] = []

  for (const msg of turnMessages) {
    if (msg.role === 'assistant') {
      const assistantMsg = msg as ChatAssistantMessage
      timestamp = assistantMsg.timestamp
      for (const block of assistantMsg.content) {
        if (block.type === 'thinking' && block.thinking?.trim()) {
          steps.push({ type: 'thinking', text: block.thinking })
        } else if (block.type === 'toolCall') {
          const preview = getToolCallPreview(block.name, block.arguments)
          steps.push({
            type: 'toolCall',
            text: preview.text,
            toolName: block.name,
            codeArgument: preview.codeArgument
          })
          pendingToolCalls.push({ name: block.name, id: block.id })
          answer.call(block.id, block.name, block.arguments)
        } else if (block.type === 'text' && block.text.trim()) {
          texts.push(block.text)
          answer.text(block.text)
        }
      }
    } else if (msg.role === 'toolResult') {
      const toolResult = msg as ChatToolResultMessage
      // Remove the matching pending tool call
      // react-doctor/js-index-maps: false positive — pendingToolCalls mutates
      // (splice) each iteration, so a pre-built Map would be stale mid-loop.
      const pendingIdx = pendingToolCalls.findIndex(
        (tc) => tc.id === toolResult.toolCallId
      )
      if (pendingIdx >= 0) pendingToolCalls.splice(pendingIdx, 1)
      answer.result(toolResult)

      if (toolResult.isError) {
        // react-doctor/js-index-maps: false positive — one-shot lookup on a
        // local array per iteration; overhead of building a Map exceeds benefit.
        const errorText =
          toolResult.content.find((c) => c.type === 'text')?.text ??
          i18n.t('chat:toolPreview.toolFailed', {
            tool: capitalCase(toolResult.toolName)
          })
        steps.push({
          type: 'toolResult',
          text: errorText,
          isError: true,
          toolName: toolResult.toolName
        })
      }

      if (
        toolResult.toolName === TOOL_NAMES.webSearch &&
        !toolResult.isError &&
        Array.isArray(toolResult.details) &&
        toolResult.details.length > 0
      ) {
        // Collect webSearch results and add as timeline step
        const results = toolResult.details as WebSearchResult[]
        webSearchResults.push(...results)
        steps.push({
          type: 'toolResult',
          text: i18n.t('chat:toolPreview.webSearchResultCount', {
            count: results.length
          }),
          toolName: TOOL_NAMES.webSearch,
          webSearchResults: results
        })
      } else if (
        toolResult.toolName === TOOL_NAMES.webFetch &&
        !toolResult.isError &&
        toolResult.details &&
        typeof toolResult.details === 'object' &&
        !Array.isArray(toolResult.details) &&
        typeof (toolResult.details as { link?: unknown }).link === 'string' &&
        typeof (toolResult.details as { rank?: unknown }).rank === 'number'
      ) {
        // A fetched page is a citeable source too — register it so the
        // model's 【N-source】 markers resolve, and still show the card.
        webSearchResults.push(toolResult.details as WebSearchResult)
        toolCards.push(toolResult)
      } else if (!toolResult.isError) {
        // Non-webSearch successful tool results → render as cards
        toolCards.push(toolResult)
      }
    }
  }

  // Prefer the server-stamped turn duration on the last assistant message —
  // it's wall-clock accurate and works for single-message turns. Fall back to
  // the message-timestamp diff for legacy chats persisted before durationMs
  // was added.
  let durationMs = 0
  for (let i = turnMessages.length - 1; i >= 0; i--) {
    const m = turnMessages[i]
    if (m.role === 'assistant') {
      const stamped = (m as ChatAssistantMessage).durationMs
      if (typeof stamped === 'number') {
        durationMs = stamped
        break
      }
    }
  }
  if (durationMs === 0) {
    const firstTs = turnMessages[0]?.timestamp ?? 0
    const lastTs = turnMessages.at(-1)?.timestamp ?? 0
    durationMs = firstTs && lastTs ? lastTs - firstTs : 0
  }

  const body = texts.join('\n\n')
  return {
    runId,
    messages: turnMessages,
    steps,
    blocks: answer.blocks,
    body,
    timestamp,
    pendingToolCalls,
    toolCards,
    durationMs,
    hasContent:
      steps.length > 0 ||
      body.length > 0 ||
      pendingToolCalls.length > 0 ||
      toolCards.length > 0,
    webSearchResults
  }
}

/**
 * Segments from the previous pass, keyed by their first message's id. While a
 * reply streams, `messages` is a new array on every frame but only its last
 * element is a new object; with a cache, every segment whose messages are the
 * same objects as last time comes back as the *same* segment. That identity is
 * what `AssistantTurnSegment`'s memo (and the citation arrays below) key on —
 * without it each frame rebuilt, and re-rendered, the entire transcript.
 */
export type SegmentCache = Map<string, Segment>

const splitMessages = new WeakMap<ChatMessage, ChatMessage>()

/**
 * An assistant message with a `<thinking>` span the model wrote into its text
 * split out as a thinking block, for the timeline — the kernel does this as it
 * streams, but messages saved before it did hold the span as text. The same
 * object for the same message (and the message itself when there is nothing
 * to split), so the segment cache still sees the turn as unchanged.
 */
function withThinkingTagsSplit(message: ChatMessage): ChatMessage {
  if (message.role !== 'assistant') return message
  const cached = splitMessages.get(message)
  if (cached) return cached
  const content = splitThinkingTagsInContent(message.content)
  const split =
    content === message.content
      ? message
      : ({ ...message, content } as ChatAssistantMessage)
  splitMessages.set(message, split)
  return split
}

function sameMessages(a: ChatMessage[], b: ChatMessage[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * Group messages into segments: a user message, the assistant + toolResult
 * messages of one run (keyed by `runId`), or a regenerate group — its question
 * and the answers on show — where the group's first run stands. A message
 * without a `runId` — a fixture, a row older than the column — joins the run
 * of the user message before it, which is the same grouping.
 */
// eslint-disable-next-line react-refresh/only-export-components -- pure helper, exported for tests
export function groupIntoSegments(
  messages: ChatMessage[],
  cache?: SegmentCache
): Segment[] {
  // `null` holds the place of a group until all of its messages are in.
  const segments: Array<Segment | null> = []
  const seen: SegmentCache = new Map()
  let turnBuffer: ChatMessage[] = []
  let turnRunId = ''
  let currentRun = ''

  const runs = runAttemptInfos(messages)
  const groupOfRun = regenerateGroups(runs)
  const groups = new Map<string, { at: number; messages: ChatMessage[] }>()

  const turnOf = (runId: string, raw: ChatMessage[]) => {
    const key = `run:${runId}`
    const cached = cache?.get(key)
    const turnMessages = raw.map((m) => withThinkingTagsSplit(m))
    const segment: Segment =
      cached?.type === 'assistantTurn' &&
      sameMessages(cached.turn.messages, turnMessages)
        ? cached
        : {
            type: 'assistantTurn',
            turn: buildAssistantTurn(runId, turnMessages)
          }
    seen.set(key, segment)
    return segment
  }

  const flushTurn = () => {
    if (turnBuffer.length > 0) {
      const segment = turnOf(turnRunId, turnBuffer)
      if (segment.turn.hasContent) segments.push(segment)
      turnBuffer = []
    }
  }

  for (const msg of messages) {
    const runId =
      msg.role === 'user'
        ? (msg.runId ?? msg.id)
        : (msg.runId ?? currentRun ?? msg.id)
    const groupId = groupOfRun.get(runId)
    if (groupId) {
      flushTurn()
      if (msg.role === 'user') currentRun = runId
      let group = groups.get(groupId)
      if (!group) {
        group = { at: segments.length, messages: [] }
        groups.set(groupId, group)
        segments.push(null)
      }
      group.messages.push(msg)
    } else if (msg.role === 'user') {
      flushTurn()
      currentRun = runId
      const key = `user:${msg.id}`
      const cached = cache?.get(key)
      const segment: Segment =
        cached?.type === 'user' && cached.message === msg
          ? cached
          : { type: 'user', message: msg }
      seen.set(key, segment)
      segments.push(segment)
    } else {
      if (turnBuffer.length > 0 && runId !== turnRunId) flushTurn()
      turnRunId = runId
      turnBuffer.push(msg)
    }
  }
  flushTurn()

  for (const [groupId, group] of groups) {
    const key = `group:${groupId}`
    const locked = isLocked(runs, groupId)
    const cached = cache?.get(key)
    const segment =
      cached?.type === 'compare' &&
      cached.locked === locked &&
      sameMessages(cached.messages, group.messages)
        ? cached
        : buildCompareSegment(groupId, group.messages, locked, turnOf)
    if (!segment) continue
    // A reused segment's turns are in use too: they stay in the cache.
    if (segment === cached) {
      for (const turn of [...segment.columns, segment.folded]) {
        if (turn) turnOf(turn.runId, turn.messages)
      }
    }
    seen.set(key, segment)
    segments[group.at] = segment
  }

  // Keep only what this pass saw, so a long-lived cache can't outgrow the chat.
  if (cache) {
    cache.clear()
    for (const [key, segment] of seen) cache.set(key, segment)
  }

  return segments.filter((segment) => segment !== null)
}

/**
 * The group each run of a regenerate group belongs to, by run id: every run
 * that re-asks another (`alternateOf`) or carries a state, and the run they
 * name. An ordinary run is in no group.
 */
function regenerateGroups(
  runs: ReturnType<typeof runAttemptInfos>
): Map<string, string> {
  const groupIds = new Set<string>()
  for (const run of runs) {
    if (run.alternateOf || run.attempt) {
      groupIds.add(run.alternateOf ?? run.runId)
    }
  }
  const groupOfRun = new Map<string, string>()
  if (groupIds.size === 0) return groupOfRun
  for (const run of runs) {
    const groupId = run.alternateOf ?? run.runId
    if (groupIds.has(groupId)) groupOfRun.set(run.runId, groupId)
  }
  return groupOfRun
}

/**
 * A regenerate group's messages as what is on show: the newest two answers
 * that are neither folded nor hidden (one, once the group is settled), and
 * the folded one. `null` for a group with nothing to show.
 */
function buildCompareSegment(
  groupId: string,
  messages: ChatMessage[],
  locked: boolean,
  turnOf: (
    runId: string,
    messages: ChatMessage[]
  ) => Extract<Segment, { type: 'assistantTurn' }>
): CompareSegment | null {
  const runs = new Map<string, { asked: ChatMessage; rest: ChatMessage[] }>()
  let current = ''
  for (const msg of messages) {
    if (msg.role === 'user') {
      current = msg.runId ?? msg.id
      runs.set(current, { asked: msg, rest: [] })
    } else {
      runs.get(msg.runId ?? current)?.rest.push(msg)
    }
  }

  const shown: Array<{ asked: ChatMessage; turn: AssistantTurn }> = []
  let folded: AssistantTurn | null = null
  for (const [runId, { asked, rest }] of runs) {
    const attempt = asked.role === 'user' ? asked.attempt : null
    if (attempt === 'hidden') continue
    const { turn } = turnOf(runId, rest)
    if (attempt === 'folded') folded = turn
    else shown.push({ asked, turn })
  }
  if (shown.length === 0 && folded === null) return null

  const columns = shown.slice(-2)
  return {
    type: 'compare',
    groupId,
    question: columns[0]?.asked ?? messages[0],
    columns:
      columns.length > 0
        ? columns.map((c) => c.turn)
        : [folded as AssistantTurn],
    folded: columns.length > 0 ? folded : null,
    locked,
    messages
  }
}

/** What `buildCitationSources` returned last time, to reuse arrays from. */
export interface CitationSourcesCache {
  turns: AssistantTurn[]
  sources: WebSearchResult[][]
}

/**
 * Every web-search source seen through each assistant turn, in chat order — a
 * turn can cite a source an earlier turn found, so badge resolution needs the
 * cumulative set. A turn's array only changes if that turn or one before it
 * did; otherwise the previous array is handed back, because `Markdown` is
 * memoized on its identity: a fresh array per frame re-parsed every message in
 * any chat that had run a web search.
 *
 * The answers of a regenerate group are attempts at one question: each sees
 * what came before the group and its own sources, never the other's; what
 * follows the group sees the answers on show.
 */
// eslint-disable-next-line react-refresh/only-export-components -- pure helper, exported for tests
export function buildCitationSources(
  segments: Segment[],
  cache?: CitationSourcesCache
): Map<AssistantTurn, WebSearchResult[]> {
  const map = new Map<AssistantTurn, WebSearchResult[]>()
  const turns: AssistantTurn[] = []
  const sources: WebSearchResult[][] = []
  const acc: WebSearchResult[] = []
  let prefixUnchanged = cache !== undefined

  const record = (turn: AssistantTurn, build: () => WebSearchResult[]) => {
    const i = turns.length
    prefixUnchanged = prefixUnchanged && cache?.turns[i] === turn
    const forTurn = prefixUnchanged && cache ? cache.sources[i] : build()
    turns.push(turn)
    sources.push(forTurn)
    map.set(turn, forTurn)
  }

  for (const segment of segments) {
    if (segment.type === 'assistantTurn') {
      acc.push(...segment.turn.webSearchResults)
      record(segment.turn, () => acc.slice())
    } else if (segment.type === 'compare') {
      const before = acc.slice()
      for (const turn of [...segment.columns, segment.folded]) {
        if (!turn) continue
        record(turn, () => [...before, ...turn.webSearchResults])
      }
      for (const turn of segment.columns) acc.push(...turn.webSearchResults)
    }
  }

  if (cache) {
    cache.turns = turns
    cache.sources = sources
  }
  return map
}

function Messages({
  chatId,
  status,
  messages,
  regenerate,
  chooseAttempt,
  showDiscover,
  runError
}: MessagesProps) {
  const { t } = useTranslation('chat')
  const isLoading = status === 'streaming' || status === 'submitted'
  const { data: settings } = useSettings()
  const chatBoxRef = useRef<HTMLDivElement>(null)
  const isAtBottom = useRef(true)
  const [showScrollButton, setShowScrollButton] = useState(false)

  // Discover only reshapes the landing screen when it's the true home route
  // AND the user has opted in. Gating on `showDiscover` alone would top-align
  // every existing user's greeting even though Discover defaults off.
  const discoverActive =
    (showDiscover ?? false) && (settings?.discover?.enabled ?? false)

  // The greeting only gives up its centered position once the feed actually
  // has recommendations to show. Enabled-but-empty (first opt-in, a warming
  // feed, a failed refresh) keeps the original, uncluttered welcome page.
  const { feed: discoverFeed } = useDiscoverFeed(discoverActive)
  const discoverHasContent =
    discoverActive && (discoverFeed?.groups.length ?? 0) > 0

  // Caches of the previous pass, so unchanged segments (and their citation
  // arrays) keep their identity from frame to frame — see `SegmentCache`. Both
  // are pure memo tables: same input, same output, whatever is in them. Turn
  // labels are translated when a turn is built, hence a fresh pair per `t`.
  const caches = useMemo(
    () => ({
      segments: new Map() as SegmentCache,
      citations: { turns: [], sources: [] } as CitationSourcesCache
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is the reset key
    [t]
  )

  const segments = useMemo(
    () => groupIntoSegments(messages, caches.segments),
    [messages, caches]
  )

  // The messages the chat opened with: history, rendered in place. Only a
  // run that starts after that is "fresh" and gets an entrance — the whole
  // transcript rising on every open would be motion without a purpose.
  const [openedWith] = useState(() => new Set(messages.map((m) => m.id)))
  const isFresh = (runId: string) => !openedWith.has(runId)

  // The rail lists what is on screen: a regenerate group asks its question
  // once, however many attempts stand behind it.
  const questions = useMemo(() => questionsOf(segments), [segments])

  // Keyed by the segment object (same memoized refs used in render below).
  const citationSourcesByTurn = useMemo(
    () => buildCitationSources(segments, caches.citations),
    [segments, caches]
  )

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'instant') => {
    const $el = chatBoxRef.current
    if (!$el) return
    $el.scrollTo({ top: $el.scrollHeight, behavior })
    isAtBottom.current = true
    setShowScrollButton(false)
  }, [])

  // Mount / route change: instant scroll to bottom
  useEffect(() => {
    scrollToBottom('instant')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Submit: force-scroll to bottom so user sees their message + spinner.
  useEffect(() => {
    if (status === 'submitted') {
      // False positive for react-doctor/no-adjust-state-on-prop-change:
      // scrollToBottom() is an imperative DOM scroll — not a setState that copies
      // a prop into state. The rule flags all calls inside prop-keyed effects but
      // this side-effect on a status transition is intentional and correct.
      // react-doctor-disable-next-line react-doctor/no-adjust-state-on-prop-change -- DOM scroll, not a prop copy
      scrollToBottom('instant')
    }
  }, [status, scrollToBottom])

  const handleScroll = useCallback(() => {
    const $el = chatBoxRef.current
    if (!$el) return
    const atBottom =
      $el.scrollHeight - $el.scrollTop - $el.clientHeight < AT_BOTTOM_THRESHOLD
    isAtBottom.current = atBottom
    setShowScrollButton(!atBottom)
  }, [])

  return (
    <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
      <section
        className={cn(
          // A query container: a comparison takes its width from the chat
          // area (`cqw`), not from the reading column it stands in.
          'no-scrollbar @container flex flex-1 flex-col items-center gap-8 overflow-y-scroll px-16 pt-4 transition-[padding] duration-200 ease-out',
          // Room for the floating composer to clear the last message — but
          // only once it's floating (the landing screen keeps it in flow).
          messages.length === 0 ? 'pb-6' : 'pb-36'
        )}
        ref={chatBoxRef}
        onScroll={handleScroll}
      >
        {messages.length === 0 && (
          <div
            className={cn(
              'animate-fade-in-up mx-auto flex size-full max-w-3xl flex-col px-8',
              discoverHasContent
                ? 'justify-start pt-4'
                : 'justify-center md:mt-20'
            )}
          >
            {/* The generic greeting is filler once a personalized feed fills
                the screen — drop it and let Discover be the landing content. */}
            {!discoverHasContent && (
              <>
                <p className="text-3xl font-bold tracking-tight">
                  {t('messageList.greetingTitle')}
                </p>
                <p className="text-muted-foreground mt-2 text-lg">
                  {t('messageList.greetingSubtitle')}
                </p>
              </>
            )}
            {discoverActive && <DiscoverFeed />}
          </div>
        )}

        <div className="w-full md:max-w-3xl">
          {segments.map((segment, segIdx) => {
            if (segment.type === 'user') {
              return (
                <UserSegment
                  key={segment.message.id}
                  message={segment.message}
                  fresh={isFresh(segment.message.runId ?? segment.message.id)}
                />
              )
            }

            const isLastSegment = segIdx === segments.length - 1
            const turnIsStreaming = isLoading && isLastSegment

            if (segment.type === 'compare') {
              // While two answers are compared the group — its question
              // too — takes the width of the chat.
              return (
                <div
                  key={`group-${segment.groupId}`}
                  className={cn(segment.columns.length > 1 && COMPARE_FRAME)}
                >
                  <UserSegment
                    message={segment.question}
                    fresh={isFresh(segment.groupId)}
                  />
                  <CompareTurns
                    chatId={chatId}
                    segment={segment}
                    citationSources={citationSourcesByTurn}
                    streaming={turnIsStreaming}
                    regenerate={regenerate}
                    choose={chooseAttempt}
                    runError={runError}
                    opened={openedWith}
                  />
                </div>
              )
            }

            return (
              <AssistantTurnSegment
                key={`run-${segment.turn.runId}`}
                chatId={chatId}
                turn={segment.turn}
                citationSources={citationSourcesByTurn.get(segment.turn)}
                isStreaming={turnIsStreaming}
                regenerate={regenerate}
                fresh={isFresh(segment.turn.runId)}
                error={
                  runError?.runId === segment.turn.runId
                    ? runError.message
                    : undefined
                }
              />
            )
          })}

          {/* A run that failed before any step completed has no turn to
              carry its error; it shows under the prompt. */}
          {runError && !showsRun(segments, runError.runId) && (
            <p role="alert" className="text-destructive mb-8 text-sm">
              {t('run.error', { message: runError.message })}
            </p>
          )}

          {shouldShowMessageSpinner(segments, isLoading) && <MessageSpinner />}
        </div>
      </section>

      <ChatToc scrollContainerRef={chatBoxRef} messages={questions} />

      {showScrollButton && messages.length > 0 && (
        <Button
          variant="secondary"
          size="icon-lg"
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-full border shadow-md"
          aria-label={t('messageList.scrollToBottom')}
        >
          <ArrowDownIcon />
        </Button>
      )}
    </div>
  )
}

export default memo(Messages)
