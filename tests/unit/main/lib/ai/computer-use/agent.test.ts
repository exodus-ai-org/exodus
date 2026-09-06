import type { Model } from '@mariozechner/pi-ai'
import { describe, expect, it, vi } from 'vitest'

// `agent.ts` imports `complete` from `@mariozechner/pi-ai` and `action-tools.ts`
// imports `Type` from it. Neither `trimImages` nor `toolCallToAction` touches
// the network — mock the module so the pure functions import cheaply.
vi.mock('@mariozechner/pi-ai', () => ({
  Type: {
    Object: (o: unknown) => o,
    Array: (_t: unknown, o?: unknown) => o ?? {},
    Number: (o?: unknown) => o ?? {},
    String: (o?: unknown) => o ?? {},
    Boolean: (o?: unknown) => o ?? {},
    Optional: (t: unknown) => t,
    Union: (_t: unknown, o?: unknown) => o ?? {},
    Literal: (v: unknown) => ({ const: v })
  },
  complete: vi.fn()
}))

const { trimImages, ClaudeComputerAgent } =
  await import('@main/lib/ai/computer-use/agent')
const { toolCallToAction, ACTION_TOOLS } =
  await import('@main/lib/ai/computer-use/action-tools')
const { complete } = await import('@mariozechner/pi-ai')

describe('toolCallToAction', () => {
  // One row per model-facing verb. Coordinates are asymmetric (x ≠ y, from ≠ to,
  // dx ≠ dy) so a coordinate swap or a `kind`/`button`/`count` mistake is caught.
  const cases: Array<{
    name: string
    args: Record<string, unknown>
    expected: unknown
  }> = [
    {
      name: 'moveTo',
      args: { x: 10, y: 20 },
      expected: { kind: 'moveMouse', to: [10, 20] }
    },
    {
      name: 'leftClick',
      args: { x: 3, y: 4 },
      expected: { kind: 'click', to: [3, 4], button: 'left' }
    },
    {
      name: 'doubleClick',
      args: { x: 5, y: 6 },
      expected: { kind: 'click', to: [5, 6], button: 'left', count: 2 }
    },
    {
      name: 'rightClick',
      args: { x: 7, y: 8 },
      expected: { kind: 'click', to: [7, 8], button: 'right' }
    },
    {
      name: 'drag',
      args: { x1: 1, y1: 2, x2: 8, y2: 9 },
      expected: { kind: 'drag', from: [1, 2], to: [8, 9] }
    },
    {
      name: 'scroll',
      args: { dx: 3, dy: -7 },
      expected: { kind: 'wheel', dx: 3, dy: -7 }
    },
    {
      name: 'type',
      args: { text: 'hello world' },
      expected: { kind: 'type', text: 'hello world' }
    },
    {
      name: 'key',
      args: { combo: 'cmd+c' },
      expected: { kind: 'hotkey', combo: 'cmd+c' }
    },
    { name: 'wait', args: { ms: 800 }, expected: { kind: 'wait', ms: 800 } },
    {
      name: 'askHuman',
      args: { question: 'enter the code' },
      expected: { kind: 'askHuman', question: 'enter the code' }
    },
    {
      name: 'done',
      args: { success: true, summary: 'x' },
      expected: { kind: 'done', success: true, summary: 'x' }
    }
  ]

  it.each(cases)('maps $name (#$#)', ({ name, args, expected }) => {
    expect(toolCallToAction(name, args)).toEqual(expected)
  })

  it('covers every verb in ACTION_TOOLS', () => {
    const covered = new Set(cases.map((c) => c.name))
    for (const tool of ACTION_TOOLS) {
      expect(covered.has(tool.name)).toBe(true)
    }
  })

  it('throws on an unknown tool name', () => {
    expect(() => toolCallToAction('bogus', {})).toThrow(/unknown action/)
  })

  it('exposes exactly the 11 model-facing verbs', () => {
    expect(ACTION_TOOLS.map((t) => t.name).sort()).toEqual(
      [
        'askHuman',
        'done',
        'doubleClick',
        'drag',
        'key',
        'leftClick',
        'moveTo',
        'rightClick',
        'scroll',
        'type',
        'wait'
      ].sort()
    )
  })
})

describe('trimImages', () => {
  const msg = (step: number) => ({
    role: 'toolResult' as const,
    toolCallId: `tc${step}`,
    toolName: 'click',
    content: [
      { type: 'text' as const, text: `step ${step} · cursor 0,0` },
      { type: 'image' as const, data: `img${step}`, mimeType: 'image/png' }
    ],
    isError: false,
    timestamp: 0
  })

  it('keeps images only on the last 3 image-bearing messages', () => {
    const input = [msg(1), msg(2), msg(3), msg(4), msg(5), msg(6)]

    const out = trimImages(input as never, 3)

    for (const i of [0, 1, 2]) {
      expect(out[i].content).toEqual([
        { type: 'text', text: `step ${i + 1} · cursor 0,0` },
        { type: 'text', text: '[screenshot omitted]' }
      ])
    }

    for (const i of [3, 4, 5]) {
      expect(out[i].content).toEqual([
        { type: 'text', text: `step ${i + 1} · cursor 0,0` },
        { type: 'image', data: `img${i + 1}`, mimeType: 'image/png' }
      ])
    }
  })

  it('returns a new array and does not mutate the input', () => {
    const input = [msg(1), msg(2), msg(3), msg(4)]
    const snapshot = JSON.stringify(input)

    const out = trimImages(input as never, 3)

    expect(out).not.toBe(input)
    expect(JSON.stringify(input)).toBe(snapshot)
    // message 0 is the only one trimmed; its object is a fresh copy
    expect(out[0]).not.toBe(input[0])
    expect(out[1]).toBe(input[1])
  })

  it('is a no-op when there are 3 or fewer image-bearing messages', () => {
    const input = [msg(1), msg(2), msg(3)]
    const out = trimImages(input as never, 3)
    expect(out).toEqual(input)
  })

  it('passes image-free messages through and does not count them toward keep', () => {
    const textOnly = (text: string) => ({
      role: 'assistant' as const,
      content: [{ type: 'text' as const, text }],
      timestamp: 0
    })
    // image-bearing messages sit at indices 0, 2, 4; text-only at 1, 3
    const input = [
      msg(1),
      textOnly('thinking a'),
      msg(2),
      textOnly('thinking b'),
      msg(3)
    ]

    const out = trimImages(input as never, 2)

    // only the oldest of the 3 image-bearing messages is trimmed
    expect(out[0].content).toEqual([
      { type: 'text', text: 'step 1 · cursor 0,0' },
      { type: 'text', text: '[screenshot omitted]' }
    ])
    // image-free messages are returned by reference, untouched
    expect(out[1]).toBe(input[1])
    expect(out[3]).toBe(input[3])
    // the last 2 image-bearing messages keep their image
    expect(out[2].content[1]).toEqual({
      type: 'image',
      data: 'img2',
      mimeType: 'image/png'
    })
    expect(out[4].content[1]).toEqual({
      type: 'image',
      data: 'img3',
      mimeType: 'image/png'
    })
  })
})

describe('ClaudeComputerAgent — humanNote wiring', () => {
  const baseState = {
    target: { app: 'Chess', title: 'Chess' },
    viewport: { width: 800, height: 600 },
    cursor: [400, 300] as [number, number],
    screenshot: {
      data: 'PNG',
      mimeType: 'image/png' as const,
      width: 800,
      height: 600
    }
  }

  it('puts the human answer in the next tool result instead of the cursor line', async () => {
    const completeMock = vi.mocked(complete)
    completeMock.mockReset()
    completeMock.mockImplementation(
      async () =>
        ({
          role: 'assistant',
          content: [
            { type: 'toolCall', id: 'c1', name: 'wait', arguments: { ms: 1 } }
          ]
        }) as unknown as Awaited<ReturnType<typeof complete>>
    )

    const agent = new ClaudeComputerAgent({
      task: 'play',
      model: {} as unknown as Model<string>,
      apiKey: 'k'
    })

    await agent.nextAction({ ...baseState, step: 1 })
    await agent.nextAction({ ...baseState, step: 2, humanNote: '123456' })
    await agent.nextAction({ ...baseState, step: 3 })

    const lastResultText = (call: number): string | undefined => {
      const context = completeMock.mock.calls[call][1] as {
        messages: Array<{ content: Array<{ type: string; text?: string }> }>
      }
      const msgs = context.messages
      return msgs[msgs.length - 1].content[0].text
    }

    // 2nd call: the tool result carries "Human: <answer>"
    expect(lastResultText(1)).toBe('Human: 123456')
    // 3rd call: back to the normal step/cursor line
    expect(lastResultText(2)).toBe('step 3 · cursor 400,300')
  })
})
