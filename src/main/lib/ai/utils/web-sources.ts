import { TOOL_NAMES } from '@exodus/shared/constants/tool-names'
import type { ChatMessage } from '@exodus/shared/types/chat'

const rankOf = (source: unknown): number =>
  typeof source === 'object' &&
  source !== null &&
  typeof (source as { rank?: unknown }).rank === 'number' &&
  Number.isFinite((source as { rank: number }).rank)
    ? (source as { rank: number }).rank
    : 0

/**
 * The highest number a source of the conversation carries — of its searches'
 * results and of the pages it fetched. The tools' rank registry is made anew
 * for every request, so a later run numbers its sources from here: a
 * 【3-source】 means one source in the whole chat, whichever run found it.
 * (Before 2026-09-29 every run started at 1 again, and a marker of a later
 * run could not be told from an earlier one's.)
 */
export function highestSourceRank(messages: ChatMessage[]): number {
  let highest = 0
  for (const message of messages) {
    if (message.role !== 'toolResult' || message.isError) continue
    const { details } = message as { details?: unknown }
    if (message.toolName === TOOL_NAMES.webSearch && Array.isArray(details)) {
      for (const source of details) highest = Math.max(highest, rankOf(source))
    } else if (message.toolName === TOOL_NAMES.webFetch) {
      highest = Math.max(highest, rankOf(details))
    }
  }
  return highest
}
