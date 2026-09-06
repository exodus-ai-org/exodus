// Computer Use — the inner-loop agent (the "brain").
//
// Holds the LLM conversation for one computer-use session: feeds each fresh
// `ComputerState` in as a screenshot, calls the model with the inner tool set
// (`ACTION_TOOLS`), and turns the model's one tool call per turn into a typed
// `Action`. Spec §3.1–§3.4.
//
// `ClaudeComputerAgent` is named for the reference design; any vision +
// tool-calling chat model works with the screenshot loop. The ctor takes
// whatever `getModelFromProvider` resolved (Task 9 wires that up).

import { complete } from '@mariozechner/pi-ai'
import type {
  ImageContent,
  Message,
  Model,
  TextContent,
  ToolCall,
  ToolResultMessage,
  UserMessage
} from '@mariozechner/pi-ai'

import type { Action, ComputerState } from '../../computer/types'
import { ACTION_TOOLS, toolCallToAction } from './action-tools'
import { computerSystemPrompt } from './system-prompt'

export interface ComputerAgent {
  nextAction(state: ComputerState): Promise<Action>
}

/** Tool-result messages older than this lose their screenshot (spec §3.3). */
const KEEP_IMAGES = 3

function hasImage(m: Message): boolean {
  return Array.isArray(m.content) && m.content.some((c) => c.type === 'image')
}

/**
 * Rewrites history so only the last `keep` messages that carry an image keep
 * it; every earlier image block becomes `{type:'text', text:'[screenshot
 * omitted]'}`. The sibling text block in the same content array still reads
 * "step N · cursor …", so the placeholder needs no number. Returns a new
 * array — `messages` is not mutated (trimmed messages are shallow-copied).
 */
export function trimImages(messages: Message[], keep: number): Message[] {
  const imageIdx: number[] = []
  messages.forEach((m, i) => {
    if (hasImage(m)) imageIdx.push(i)
  })
  const keepSet = new Set(imageIdx.slice(Math.max(0, imageIdx.length - keep)))

  return messages.map((m, i) => {
    if (keepSet.has(i) || !hasImage(m)) return m
    const content = (m.content as (TextContent | ImageContent)[]).map(
      (c): TextContent | ImageContent =>
        c.type === 'image' ? { type: 'text', text: '[screenshot omitted]' } : c
    )
    return { ...m, content } as Message
  })
}

export class ClaudeComputerAgent implements ComputerAgent {
  private readonly task: string
  private readonly model: Model<string>
  private readonly apiKey: string
  private readonly messages: Message[] = []
  private systemPrompt: string | null = null
  private pendingCall: { id: string; name: string } | null = null

  constructor(opts: { task: string; model: Model<string>; apiKey: string }) {
    this.task = opts.task
    this.model = opts.model
    this.apiKey = opts.apiKey
  }

  async nextAction(state: ComputerState): Promise<Action> {
    // The model works entirely in screenshot space: it is shown the (possibly
    // downscaled) screenshot, `state.cursor` is already in that space, and the
    // actions it emits are too. `hands.decompose` is the sole screenshot→window
    // converter (via `scaleFactor`). So the prompt bounds come from
    // `state.screenshot.{width,height}` and the cursor line is rendered as-is.
    // Prompt is cached from the first frame's screenshot dims.
    this.systemPrompt ??= computerSystemPrompt({
      task: this.task,
      width: state.screenshot.width,
      height: state.screenshot.height
    })

    const screenshot: ImageContent = {
      type: 'image',
      data: state.screenshot.data,
      mimeType: 'image/png'
    }

    if (this.messages.length === 0) {
      const first: UserMessage = {
        role: 'user',
        content: [
          { type: 'text', text: 'Here is the current screen. Begin the task.' },
          screenshot
        ],
        timestamp: Date.now()
      }
      this.messages.push(first)
    } else if (this.pendingCall) {
      const noteText = state.humanNote
        ? `Human: ${state.humanNote}`
        : state.systemNote
          ? state.systemNote
          : `step ${state.step} · cursor ${state.cursor[0]},${state.cursor[1]}`
      const result: ToolResultMessage = {
        role: 'toolResult',
        toolCallId: this.pendingCall.id,
        toolName: this.pendingCall.name,
        content: [{ type: 'text', text: noteText }, screenshot],
        isError: state.systemNote != null,
        timestamp: Date.now()
      }
      this.messages.push(result)
    }

    const res = await complete(
      this.model,
      {
        systemPrompt: this.systemPrompt,
        messages: trimImages(this.messages, KEEP_IMAGES),
        tools: ACTION_TOOLS
      },
      { apiKey: this.apiKey }
    )

    // Parallel tool use is enabled (no `toolChoice`), so the model may emit
    // more than one `toolCall`. We only ever act on the first; drop the rest
    // before storing, or the next request would carry an assistant turn with
    // an unanswered `tool_use` block and the provider would reject it.
    let keptToolCall = false
    res.content = res.content.filter((c) => {
      if (c.type !== 'toolCall') return true
      if (keptToolCall) return false
      keptToolCall = true
      return true
    })
    this.messages.push(res)

    const call = res.content.find((c): c is ToolCall => c.type === 'toolCall')
    if (!call) {
      this.pendingCall = null
      return {
        kind: 'done',
        success: false,
        summary: 'model produced no action'
      }
    }

    this.pendingCall = { id: call.id, name: call.name }
    return toolCallToAction(call.name, call.arguments)
  }
}
