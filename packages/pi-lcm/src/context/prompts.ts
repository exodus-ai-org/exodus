export function getLeafSummaryPrompt(previousContext: string): string {
  const prevSection = previousContext
    ? `\n\nPrevious context summary for continuity:\n${previousContext}`
    : ''

  return `You are a memory compaction engine. Your task is to compress a segment of conversation into a dense, retrievable summary.

Rules:
- Preserve: decisions made, rationale given, technical details, file paths, code snippets, error messages, confirmed facts
- Preserve: the user's goals and any constraints mentioned
- Drop: pleasantries, filler, redundant restatements, incomplete thoughts that led nowhere
- Write in past tense, third person ("The user asked...", "The assistant suggested...")
- End ALWAYS with a line: "Expand for details about: <comma-separated list of compressed specifics>"
- Target length: 800–1200 tokens${prevSection}`
}

export function getD1SummaryPrompt(): string {
  return `You are a memory condensation engine. You are given multiple compressed conversation segments and must produce a session-level summary.

Rules:
- Preserve: all decisions made (including ones later superseded), key technical trajectory, chronological flow
- Include: what was tried and why it failed, pivots in approach, final outcomes
- Drop: low-level step-by-step details that are captured in child summaries
- Write in past tense, third person
- End ALWAYS with a line: "Expand for details about: <comma-separated list of compressed specifics>"
- Target length: 1500–2000 tokens`
}

export function getD2SummaryPrompt(): string {
  return `You are a memory condensation engine. You are given multiple session-level summaries and must produce a phase-level summary.

Rules:
- Preserve: major decisions, outcomes, and the reasons behind them
- Preserve: key facts, relationships, and knowledge established
- Drop: session-local mechanics, retries, intermediate steps
- Drop: anything that doesn't matter across multiple sessions
- Write in past tense, third person
- End ALWAYS with a line: "Expand for details about: <comma-separated list of compressed specifics>"
- Target length: 2000 tokens`
}

export function getDeeperSummaryPrompt(): string {
  return `You are a memory condensation engine. You are given summaries and must extract only durable, strategic context.

Rules:
- Preserve: durable facts, long-term decisions, key relationships, recurring patterns
- Preserve: user's overarching goals and hard constraints
- Drop: anything session-specific or implementation-detail-level
- Drop: anything that would only be useful in the original context
- Write in past tense, third person
- End ALWAYS with a line: "Expand for details about: <comma-separated list of compressed specifics>"
- Target length: 2000 tokens`
}

export function getSummaryPromptForDepth(
  depth: number,
  previousContext = ''
): string {
  if (depth === 0) return getLeafSummaryPrompt(previousContext)
  if (depth === 1) return getD1SummaryPrompt()
  if (depth === 2) return getD2SummaryPrompt()
  return getDeeperSummaryPrompt()
}

export function formatSummaryAsXml(summary: {
  id: string
  kind: 'leaf' | 'condensed'
  depth: number
  content: string
  descendantCount: number
  earliestAt: Date
  latestAt: Date
  parentIds?: string[]
}): string {
  const parentsSection =
    summary.parentIds && summary.parentIds.length > 0
      ? `\n  <parents>${summary.parentIds.map((id) => `\n    <summary_ref id="${id}"/>`).join('')}\n  </parents>`
      : ''

  return `<summary id="${summary.id}" kind="${summary.kind}" depth="${summary.depth}" descendant_count="${summary.descendantCount}" earliest_at="${summary.earliestAt.toISOString()}" latest_at="${summary.latestAt.toISOString()}">${parentsSection}
  <content>
${summary.content}
  </content>
</summary>`
}
