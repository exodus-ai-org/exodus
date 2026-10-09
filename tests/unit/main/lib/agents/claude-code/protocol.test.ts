// tests/unit/main/lib/agents/claude-code/protocol.test.ts
import { readFileSync } from 'fs'
import { resolve } from 'path'

import {
  parseLine,
  summarizeInput
} from '@main/lib/agents/claude-code/protocol'
import type { AgentEvent } from '@main/lib/agents/driver'
import { describe, expect, it } from 'vitest'

const FIX = resolve(import.meta.dirname, '../../../../../fixtures/claude-code')
const lines = (name: string) =>
  readFileSync(resolve(FIX, name), 'utf8').split('\n').filter(Boolean)
const eventsOf = (name: string): AgentEvent[] =>
  lines(name).flatMap((l) => parseLine(l).events)

describe('Claude Code protocol', () => {
  it('maps the allow / write / bash / question run in order', () => {
    const types = eventsOf('allow-write-bash-question.jsonl').map((e) => e.type)
    expect(types[0]).toBe('init')
    expect(types).toContain('step_start')
    expect(types.filter((t) => t === 'turn_end')).toHaveLength(3)
    expect(types.filter((t) => t === 'blocked')).toHaveLength(2) // the Write, the question
  })

  it('reads the session id and model from init', () => {
    const init = eventsOf('allow-write-bash-question.jsonl')[0]
    expect(init).toMatchObject({
      type: 'init',
      model: 'claude-haiku-4-5-20251001'
    })
    expect((init as { cliSessionId: string }).cliSessionId).toMatch(
      /^[0-9a-f-]{36}$/
    )
  })

  it('turns a permission request into a prompt and keeps the input for the answer', () => {
    const line = lines('allow-write-bash-question.jsonl').find((l) =>
      l.includes('"control_request"')
    )!
    const parsed = parseLine(line)
    expect(parsed.events).toEqual([
      {
        type: 'blocked',
        prompt: {
          kind: 'permission',
          requestId: parsed.control!.requestId,
          tool: 'Write',
          summary: '/tmp/exodus-project/hello.txt'
        }
      }
    ])
    expect(parsed.control).toMatchObject({
      toolName: 'Write',
      input: { file_path: '/tmp/exodus-project/hello.txt' }
    })
  })

  it('turns AskUserQuestion into a question prompt with its options', () => {
    const line = lines('allow-write-bash-question.jsonl').find(
      (l) => l.includes('"can_use_tool"') && l.includes('AskUserQuestion')
    )!
    const [e] = parseLine(line).events
    expect(e).toMatchObject({
      type: 'blocked',
      prompt: {
        kind: 'question',
        questions: [
          {
            question: 'Which color do you prefer?',
            multiSelect: false,
            options: [{ label: 'Red' }, { label: 'Blue' }]
          }
        ]
      }
    })
  })

  it('reports a turn end with text, cost and denials', () => {
    const ends = eventsOf('deny-interrupt-continue.jsonl').filter(
      (e) => e.type === 'turn_end'
    )
    expect(ends[0]).toMatchObject({ ok: true, interrupted: false, denials: 1 })
    expect(ends[1]).toMatchObject({ ok: false }) // error_during_execution after the interrupt
    expect((ends[0] as { costUsd: number }).costUsd).toBeGreaterThan(0)
  })

  it('streams text deltas that add up to the final text', () => {
    const evs = eventsOf('partial-messages.jsonl')
    const streamed = evs
      .filter((e) => e.type === 'text_delta')
      .map((e) => (e as { delta: string }).delta)
      .join('')
    const final = evs.find((e) => e.type === 'text') as { text: string }
    expect(streamed).toBe(final.text)
  })

  it('pairs each tool result with its step', () => {
    const evs = eventsOf('allow-write-bash-question.jsonl')
    const starts = evs
      .filter((e) => e.type === 'step_start')
      .map((e) => (e as { id: string }).id)
    const ends = evs
      .filter((e) => e.type === 'step_end')
      .map((e) => (e as { id: string }).id)
    expect(ends.every((id) => starts.includes(id))).toBe(true)
  })

  it('ignores what it does not know, and lines that are not JSON', () => {
    expect(
      parseLine('{"type":"system","subtype":"hook_started"}').events
    ).toEqual([])
    expect(
      parseLine('{"type":"system","subtype":"thinking_tokens","n":3}').events
    ).toEqual([])
    expect(parseLine('Warning: something on stdout').events).toEqual([])
    expect(parseLine('').events).toEqual([])
  })

  it('passes a rate-limit notice through only when not allowed', () => {
    expect(
      parseLine(
        '{"type":"rate_limit_event","rate_limit_info":{"status":"allowed"}}'
      ).events
    ).toEqual([])
    const [e] = parseLine(
      '{"type":"rate_limit_event","rate_limit_info":{"status":"rejected","resetsAt":1791555000,"rateLimitType":"five_hour"}}'
    ).events
    expect(e).toMatchObject({ type: 'notice' })
    expect((e as { text: string }).text).toMatch(/rejected/)
  })

  it('summarises a tool input in one line', () => {
    expect(
      summarizeInput('Bash', {
        command: 'npm install\nnpm test',
        description: 'x'
      })
    ).toBe('npm install')
    expect(summarizeInput('Grep', { pattern: 'TODO' })).toBe('TODO')
    expect(summarizeInput('Unknown', {})).toBe('')
  })
})
