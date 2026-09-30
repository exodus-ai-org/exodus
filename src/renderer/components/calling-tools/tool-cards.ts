import { TOOL_NAMES } from '@exodus/shared/constants/tool-names'

// Built-in tools that have either a dedicated card OR are intentionally
// rendered as a no-op (their output surfaces elsewhere in the UI). Anything
// outside this set — including every MCP tool — falls back to GenericToolCard
// so the user at least sees that the tool ran.
export const BUILTIN_TOOL_NAMES = new Set<string>([
  ...Object.values(TOOL_NAMES),
  'rag'
])

/** Built-ins with a card of their own in `MessageCallingTools`. */
export const CARD_TOOL_NAMES = new Set<string>([
  TOOL_NAMES.mapItinerary,
  TOOL_NAMES.weather,
  TOOL_NAMES.deepResearch,
  TOOL_NAMES.computerUse,
  TOOL_NAMES.terminal,
  TOOL_NAMES.createArtifact
])

/**
 * Built-ins whose successful result renders nothing in `MessageCallingTools`:
 * a web_search shows up as Sources in MessageAction, an image_generation has
 * a card of its own, the rest surface in the timeline row (the call and its
 * arguments) and, for an error, in the box there.
 */
export const SILENT_TOOL_NAMES = new Set<string>(
  [...BUILTIN_TOOL_NAMES].filter((name) => !CARD_TOOL_NAMES.has(name))
)

/**
 * Whether a tool's successful result is drawn as a card by
 * `MessageCallingTools` — what gives its call a place among a turn's blocks.
 */
export function hasToolCard(toolName: string): boolean {
  return !SILENT_TOOL_NAMES.has(toolName)
}
