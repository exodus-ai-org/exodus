// src/main/lib/agents/claude-code/protocol.ts
import type { AgentQuestion } from '@exodus/shared/types/agents'

import type { AgentEvent } from '../driver'

export interface ParsedLine {
  events: AgentEvent[]
  control?: {
    requestId: string
    toolName: string
    input: Record<string, unknown>
  }
}

type Json = Record<string, unknown>
const isObj = (v: unknown): v is Json =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null)

/** One line of the tool's input: the path, the command, the pattern… */
export function summarizeInput(_tool: string, input: Json): string {
  const pick = [
    'file_path',
    'path',
    'notebook_path',
    'command',
    'pattern',
    'url',
    'query',
    'description'
  ]
    .map((k) => str(input[k]))
    .find((v) => v && v.trim())
  return (pick ?? '').split('\n')[0].slice(0, 160)
}

/**
 * The FULL text the owner judges when approving a tool: never cut, and no
 * field left out — what the main rendering does not consume is appended.
 */
export function describeInput(tool: string, input: Json): string {
  const edit = (e: Json) =>
    `--- old\n${str(e.old_string) ?? ''}\n+++ new\n${str(e.new_string) ?? ''}`
  let main: string
  let consumed: string[]
  if (tool === 'Bash' && typeof input.command === 'string') {
    main = input.command
    consumed = ['command']
  } else if (tool === 'Write') {
    main = `${str(input.file_path) ?? ''}\n\n${str(input.content) ?? ''}`
    consumed = ['file_path', 'content']
  } else if (tool === 'Edit') {
    main = `${str(input.file_path) ?? ''}\n\n${edit(input)}`
    consumed = ['file_path', 'old_string', 'new_string']
  } else if (tool === 'MultiEdit' && Array.isArray(input.edits)) {
    const edits = input.edits.map((e) =>
      isObj(e) ? edit(e) : JSON.stringify(e)
    )
    main = `${str(input.file_path) ?? ''}\n\n${edits.join('\n\n')}`
    consumed = ['file_path', 'edits']
  } else {
    return JSON.stringify(input, null, 2)
  }
  const rest = Object.fromEntries(
    Object.entries(input).filter(([k]) => !consumed.includes(k))
  )
  return Object.keys(rest).length
    ? `${main}\n\nOther fields:\n${JSON.stringify(rest, null, 2)}`
    : main
}

function questions(input: Json): AgentQuestion[] {
  const qs = Array.isArray(input.questions) ? input.questions : []
  return qs.filter(isObj).map((q) => ({
    question: str(q.question) ?? '',
    header: str(q.header) ?? undefined,
    multiSelect: q.multiSelect === true,
    options: (Array.isArray(q.options) ? q.options : [])
      .filter(isObj)
      .map((o) => ({
        label: str(o.label) ?? '',
        description: str(o.description) ?? undefined
      }))
  }))
}

export function parseLine(line: string): ParsedLine {
  let e: unknown
  try {
    e = JSON.parse(line)
  } catch {
    return { events: [] }
  }
  if (!isObj(e)) return { events: [] }

  switch (e.type) {
    case 'system':
      if (e.subtype === 'init' && str(e.session_id)) {
        return {
          events: [
            {
              type: 'init',
              cliSessionId: str(e.session_id)!,
              model: str(e.model)
            }
          ]
        }
      }
      return { events: [] }

    case 'stream_event': {
      const ev = isObj(e.event) ? e.event : null
      const delta = ev && isObj(ev.delta) ? ev.delta : null
      if (
        ev?.type === 'content_block_delta' &&
        delta?.type === 'text_delta' &&
        str(delta.text)
      ) {
        return { events: [{ type: 'text_delta', delta: str(delta.text)! }] }
      }
      return { events: [] }
    }

    case 'assistant': {
      const content =
        isObj(e.message) && Array.isArray(e.message.content)
          ? e.message.content
          : []
      const events: AgentEvent[] = []
      for (const b of content.filter(isObj)) {
        if (b.type === 'text' && str(b.text))
          events.push({ type: 'text', text: str(b.text)! })
        if (b.type === 'tool_use' && str(b.id) && str(b.name)) {
          const input = isObj(b.input) ? b.input : {}
          events.push({
            type: 'step_start',
            id: str(b.id)!,
            tool: str(b.name)!,
            summary: summarizeInput(str(b.name)!, input)
          })
        }
      }
      return { events }
    }

    case 'user': {
      const content =
        isObj(e.message) && Array.isArray(e.message.content)
          ? e.message.content
          : []
      return {
        events: content
          .filter(isObj)
          .filter((b) => b.type === 'tool_result' && str(b.tool_use_id))
          .map((b) => ({
            type: 'step_end' as const,
            id: str(b.tool_use_id)!,
            isError: b.is_error === true
          }))
      }
    }

    case 'control_request': {
      const req = isObj(e.request) ? e.request : {}
      const requestId = str(e.request_id)
      if (!requestId) return { events: [] }
      if (req.subtype !== 'can_use_tool') {
        return {
          events: [
            {
              type: 'notice',
              text: `Claude Code asked for “${String(req.subtype)}”, which Exodus cannot answer — continue in Terminal.`
            }
          ]
        }
      }
      const toolName = str(req.tool_name) ?? 'Tool'
      const input = isObj(req.input) ? req.input : {}
      const prompt =
        toolName === 'AskUserQuestion'
          ? {
              kind: 'question' as const,
              requestId,
              questions: questions(input)
            }
          : {
              kind: 'permission' as const,
              requestId,
              tool: toolName,
              summary: summarizeInput(toolName, input),
              detail: describeInput(toolName, input)
            }
      return {
        events: [{ type: 'blocked', prompt }],
        control: { requestId, toolName, input }
      }
    }

    case 'result':
      return {
        events: [
          {
            type: 'turn_end',
            ok: e.subtype === 'success' && e.is_error !== true,
            interrupted: false,
            text: str(e.result) ?? '',
            costUsd:
              typeof e.total_cost_usd === 'number' ? e.total_cost_usd : null,
            denials: Array.isArray(e.permission_denials)
              ? e.permission_denials.length
              : 0
          }
        ]
      }

    case 'rate_limit_event': {
      const info = isObj(e.rate_limit_info) ? e.rate_limit_info : {}
      if (info.status === 'allowed' || !str(info.status)) return { events: [] }
      const resets =
        typeof info.resetsAt === 'number'
          ? ` · resets ${new Date(info.resetsAt * 1000).toLocaleString()}`
          : ''
      return {
        events: [
          {
            type: 'notice',
            text: `Rate limit (${str(info.rateLimitType) ?? 'usage'}): ${str(info.status)}${resets}`
          }
        ]
      }
    }

    default:
      return { events: [] }
  }
}
