import { TOOL_NAMES } from '@exodus/shared/constants/tool-names'
import type { AssistantTurn, TurnBlock } from '@exodus/shared/types/chat'
import type { WebSearchResult } from '@exodus/shared/types/web-search'
import { capitalCase } from 'change-case'
import { memo, type ReactNode, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { ENTER } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { ImageGenerationCard } from '../calling-tools/image-generation/image-generation-card'
import { ErrorBoundary, RenderFailed } from '../card-error-boundary'
import Markdown from '../markdown'
import { MessageAction } from '../massage-action'
import { MessageCallingTools } from '../messages-calling-tools'
import { ThinkingTimeline } from '../thinking-timeline'
import { collectGalleryImages } from '../web-search/collect-gallery-images'
import { collectGalleryVideos } from '../web-search/collect-gallery-videos'
import { ImageGallery } from '../web-search/image-gallery'
import { VideoCards } from '../web-search/video-cards'
import { MemoryChangeStrip } from './memory-change-strip'
import { RunApprovals } from './run-approvals'
import { UsedMemories } from './used-memories'

export type AssistantTurnSegmentProps = {
  chatId: string
  turn: AssistantTurn
  // All web-search sources seen in the chat up to and including this turn.
  // Citations (【N-source】) can reference searches run in earlier turns, so
  // badge resolution must use this cumulative set, not just the turn's own
  // results. Built in chat order, so the rank map ends up last-wins for the
  // rare case where a later turn re-runs a search with reset numbering.
  citationSources?: WebSearchResult[]
  isStreaming: boolean
  /** Absent for an answer that is not in the conversation (the folded one). */
  regenerate?: () => void
  /** The provider's error, when this run ended in one. */
  error?: string
  /** A reply to a message sent during this visit: it fades in under the dots. */
  fresh: boolean
  /**
   * A last line of the run's foot (a regenerate group's "1 other version").
   * Compared by identity: hand in the same node while nothing changed.
   */
  foot?: ReactNode
}

/**
 * One block of a turn. Every frame of a streaming run hands each block a new
 * object, so what holds a settled block still is below this: `Markdown` is
 * memoized on its text and sources, a card on its result.
 */
function TurnBlockView({
  block,
  chatId,
  runId,
  citationResults,
  isStreaming
}: {
  block: TurnBlock
  chatId: string
  runId: string
  citationResults?: WebSearchResult[]
  isStreaming: boolean
}) {
  const content = turnBlockContent({
    block,
    chatId,
    runId,
    citationResults,
    isStreaming
  })
  // A block keeps its distance from the one above it: text ends without a
  // margin of its own, so a card under it would sit against the last line.
  // (Under a card the two margins collapse into the card's own.)
  return content && <div className="not-first:mt-4">{content}</div>
}

function turnBlockContent({
  block,
  chatId,
  runId,
  citationResults,
  isStreaming
}: {
  block: TurnBlock
  chatId: string
  runId: string
  citationResults?: WebSearchResult[]
  isStreaming: boolean
}) {
  if (block.kind === 'text') {
    return (
      <ErrorBoundary
        scope="markdown"
        attributes={{ runId }}
        // The words are still worth reading when the markup is not.
        fallback={
          <pre className="font-sans whitespace-pre-wrap">{block.text}</pre>
        }
      >
        <Markdown src={block.text} webSearchResults={citationResults} />
      </ErrorBoundary>
    )
  }

  if (block.kind === 'image') {
    // A call still waiting for its result is forming only while the run
    // streams; in a run that was stopped it never will, so it shows nothing.
    if (!block.result && !isStreaming) return null
    return (
      <ErrorBoundary
        scope="tool-card"
        attributes={{
          toolName: TOOL_NAMES.imageGeneration,
          toolCallId: block.key
        }}
        fallback={
          <RenderFailed what={capitalCase(TOOL_NAMES.imageGeneration)} />
        }
      >
        <ImageGenerationCard prompt={block.prompt} result={block.result} />
      </ErrorBoundary>
    )
  }

  // The card is drawn from the tool's answer; until then its place is held.
  if (!block.result) return null
  return (
    <ErrorBoundary
      scope="tool-card"
      attributes={{ toolName: block.toolName, toolCallId: block.key }}
      fallback={<RenderFailed what={capitalCase(block.toolName)} />}
    >
      <MessageCallingTools
        chatId={chatId}
        toolResult={block.result}
        isStreaming={isStreaming}
      />
    </ErrorBoundary>
  )
}

/**
 * One run's answer: its timeline, its blocks in run order, one action bar and
 * the run's foot. Also what each column of a comparison is drawn with.
 */
export const AssistantTurnSegment = memo(
  function AssistantTurnSegment({
    chatId,
    turn,
    citationSources,
    isStreaming,
    regenerate,
    error,
    fresh,
    foot
  }: AssistantTurnSegmentProps) {
    const { t } = useTranslation('chat')
    // The turn's own searches drive the per-turn "Sources" panel; the
    // cumulative set drives inline citation badges.
    const ownSources =
      turn.webSearchResults.length > 0 ? turn.webSearchResults : undefined
    const citationResults =
      citationSources && citationSources.length > 0
        ? citationSources
        : undefined
    const galleryImages = useMemo(
      () => collectGalleryImages(turn.webSearchResults),
      [turn.webSearchResults]
    )
    const galleryVideos = useMemo(
      () => collectGalleryVideos(turn.webSearchResults),
      [turn.webSearchResults]
    )

    return (
      <div
        className={cn(
          'mb-8 flex flex-col items-start last:mb-4',
          fresh && ENTER
        )}
      >
        <div className="w-full min-w-0">
          {(turn.steps.length > 0 || isStreaming) && (
            <ThinkingTimeline
              steps={turn.steps}
              durationMs={turn.durationMs}
              isStreaming={isStreaming && turn.body.length === 0}
            />
          )}

          {/* One run, one answer: the model's text and the cards of the tools
              it called, in the order the run produced them — the text after
              a tool step is the next paragraph, not the next message — with
              one action bar. */}
          <section className="group relative" data-askable="">
            {turn.blocks.map((block) => (
              <TurnBlockView
                key={block.key}
                block={block}
                chatId={chatId}
                runId={turn.runId}
                citationResults={citationResults}
                isStreaming={isStreaming}
              />
            ))}
            {galleryImages.length > 0 && (
              <ImageGallery images={galleryImages} />
            )}
            {galleryVideos.length > 0 && <VideoCards videos={galleryVideos} />}
            {error && (
              <p role="alert" className="text-destructive mt-3 text-sm">
                {t('run.error', { message: error })}
              </p>
            )}
          </section>

          {/* The run's foot, over its action row as on the phone: a tool call
              waiting for the user's approval, and the run's memory (which
              entries it read, what it changed) — here rather than in the
              timeline, which folds when the run ends. Each renders nothing
              when there is nothing to say (`empty:`). The action row closes
              the turn. */}
          <div className="mt-3 flex flex-col gap-2 empty:hidden">
            <RunApprovals
              chatId={chatId}
              runId={turn.runId}
              active={isStreaming}
            />
            <UsedMemories chatId={chatId} runId={turn.runId} />
            <MemoryChangeStrip messages={turn.messages} active={isStreaming} />
          </div>
          {turn.body.length > 0 && (
            <MessageAction
              regenerate={regenerate}
              content={turn.body}
              webSearchResults={ownSources}
              citationSources={citationResults}
              timestamp={turn.timestamp}
            />
          )}
          {foot && <div className="mt-2">{foot}</div>}
        </div>
      </div>
    )
  },
  // During streaming, only the active turn changes — older turns rebuild structurally
  // equal `turn` objects each token. Skip them by checking message references.
  function arePropsEqual(
    prev: AssistantTurnSegmentProps,
    next: AssistantTurnSegmentProps
  ) {
    if (
      prev.chatId !== next.chatId ||
      prev.isStreaming !== next.isStreaming ||
      prev.regenerate !== next.regenerate ||
      prev.citationSources !== next.citationSources ||
      prev.error !== next.error ||
      prev.fresh !== next.fresh ||
      prev.foot !== next.foot
    ) {
      return false
    }
    const prevMsgs = prev.turn.messages
    const nextMsgs = next.turn.messages
    if (prevMsgs.length !== nextMsgs.length) return false
    for (let i = 0; i < prevMsgs.length; i++) {
      if (prevMsgs[i] !== nextMsgs[i]) return false
    }
    return true
  }
)
