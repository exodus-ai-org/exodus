// src/main/lib/ai/philharmonic/lcm/summarize.ts
import { completeSimple, type Message, type Model } from '@mariozechner/pi-ai'

import type { ConversationMessage } from '../../../db/schema'

const SYSTEM_PROMPT = `You are a context compactor for a Philharmonic Group chat (a virtual team managed by a PM with employees).

Your job: produce a SINGLE paragraph (3–8 sentences) that captures everything important from the messages below so the PM can pick up the work without rereading. Preserve:
- The user's running ask and any constraints they've stated
- Concrete decisions already made (designs chosen, employees recruited, files produced)
- Open threads / unresolved questions
- Any explicit instructions or preferences the user gave

Do NOT speculate or restate generic process. Do NOT use lists. Output only the paragraph — no preamble, no headers, no closing remarks.`

/**
 * Run the LLM compactor. We feed the older messages as a structured transcript
 * inside the user prompt rather than as multi-turn messages — the summarizer
 * is a different role from the PM and shouldn't be confused into thinking
 * it's the PM continuing the conversation.
 */
export async function summarizeMessages(args: {
  messages: ConversationMessage[]
  previousSummary?: string
  model: Model<string>
  apiKey: string
}): Promise<string> {
  const transcript = formatTranscript(args.messages, args.previousSummary)
  const promptMessage: Message = {
    role: 'user',
    content: [{ type: 'text', text: transcript }],
    timestamp: Date.now()
  }
  const result = await completeSimple(
    args.model,
    {
      systemPrompt: SYSTEM_PROMPT,
      messages: [promptMessage]
    },
    { apiKey: args.apiKey }
  )
  return result.content
    .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
    .map((c) => c.text)
    .join('')
    .trim()
}

function roleLabel(m: ConversationMessage): string {
  if (m.role === 'user') return 'User'
  if (m.role === 'pm') return 'PM'
  if (m.role === 'employee') return `Employee ${m.agentId ?? ''}`.trim()
  return 'System'
}

function formatTranscript(
  messages: ConversationMessage[],
  previousSummary?: string
): string {
  const lines: string[] = []
  if (previousSummary && previousSummary.trim().length > 0) {
    lines.push(
      `Previous summary (context that came before these messages — fold into the new summary):\n${previousSummary}\n`
    )
  }
  lines.push('Transcript to summarize:')
  for (const m of messages) {
    const label = roleLabel(m)
    const text = m.content.replace(/\s+/g, ' ').trim()
    if (text.length === 0) continue
    lines.push(`- ${label}: ${text}`)
  }
  return lines.join('\n')
}
