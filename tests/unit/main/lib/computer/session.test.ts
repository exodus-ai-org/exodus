import type { ComputerAgent } from '@main/lib/ai/computer-use/agent'
import type {
  Action,
  ComputerState,
  TargetWindow
} from '@main/lib/computer/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The session loop only touches the logger + trace-context for observability and
// the Runtime modules for the real work. `trace-context` and `ask-registry` are
// pure — use them for real. `logger` transitively pulls Electron (`paths.ts`),
// and `helper.ts` pulls `@electron-toolkit/utils`, so both are mocked. `capture`
// is mocked to skip the `nativeImage` PNG decode (spec-blessed clean path).
vi.mock('@main/lib/logger', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }
}))
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }))
vi.mock('electron', () => ({
  app: { getPath: () => '/tmp', getAppPath: () => '/repo' }
}))
vi.mock('@main/lib/computer/capture', () => ({
  screenshotWindow: vi.fn(async () => ({
    shot: { data: 'AAAA', mimeType: 'image/png', width: 800, height: 600 },
    scaleFactor: 1
  })),
  hashPng: (s: string) => s
}))

const { runComputerSession } = await import('@main/lib/computer/session')
const { mockHelper } = await import('@main/lib/computer/helper')
const { computerAskRegistry } = await import('@main/lib/computer/ask-registry')
const { Guard } = await import('@main/lib/computer/guard')
const { KEYCODES } = await import('@main/lib/computer/hands')
const { logger } = await import('@main/lib/logger')
const { screenshotWindow } = await import('@main/lib/computer/capture')

const chess: TargetWindow = {
  cgWindowId: 1,
  app: 'Chess',
  bundleId: 'com.apple.Chess',
  title: 'Chess',
  bounds: [0, 0, 800, 600]
}

/** A `ComputerAgent` that replays a fixed script and records what it was shown. */
class ScriptedAgent implements ComputerAgent {
  readonly seen: ComputerState[] = []

  constructor(private readonly script: Action[]) {}

  async nextAction(state: ComputerState): Promise<Action> {
    this.seen.push(structuredClone(state))
    const next = this.script.shift()
    if (!next) throw new Error('script exhausted')
    return next
  }
}

/** An agent that returns the same action forever. */
const looping = (action: Action): ComputerAgent => ({
  nextAction: async () => action
})

beforeEach(() => {
  mockHelper.__reset()
  mockHelper.__setWindows([chess])
  vi.mocked(logger.info).mockClear()
  vi.mocked(logger.warn).mockClear()
  vi.mocked(screenshotWindow).mockClear()
  vi.mocked(screenshotWindow).mockImplementation(async () => ({
    shot: { data: 'AAAA', mimeType: 'image/png', width: 800, height: 600 },
    scaleFactor: 1
  }))
})

describe('runComputerSession — happy path', () => {
  it('runs to done and emits the click + type helper commands', async () => {
    const agent = new ScriptedAgent([
      { kind: 'click', to: [10, 10] },
      { kind: 'type', text: 'hi' },
      { kind: 'done', success: true, summary: 'ok' }
    ])

    const res = await runComputerSession({
      sessionId: 's-happy',
      task: 'play a move',
      target: 'Chess',
      agent,
      helper: mockHelper,
      settleMs: 0
    })

    expect(res.outcome).toBe('success')
    expect(res.steps).toBe(3)
    expect(res.summary).toBe('ok')
    expect(res.finalScreenshot?.data).toBe('AAAA')

    const flat = mockHelper.sent.flat()
    expect(flat).toContainEqual({ op: 'move', x: 10, y: 10 })
    expect(flat).toContainEqual({ op: 'down', button: 'left' })
    expect(flat).toContainEqual({ op: 'up', button: 'left' })
    expect(flat).toContainEqual({ op: 'key', code: KEYCODES.h, down: true })
    expect(flat).toContainEqual({ op: 'key', code: KEYCODES.i, down: true })
  })

  it('tracks the cursor in screenshot space from the click terminal point', async () => {
    const agent = new ScriptedAgent([
      { kind: 'click', to: [123, 45] },
      { kind: 'done', success: true, summary: 'ok' }
    ])

    await runComputerSession({
      sessionId: 's-cursor',
      task: 't',
      target: 'Chess',
      agent,
      helper: mockHelper,
      settleMs: 0
    })

    // first frame: centre of the 800x600 screenshot
    expect(agent.seen[0].cursor).toEqual([400, 300])
    // second frame: wherever the (clamped) click landed
    expect(agent.seen[1].cursor).toEqual([123, 45])
  })
})

describe('runComputerSession — step cap', () => {
  it('ends failed after maxSteps without a done', async () => {
    const res = await runComputerSession({
      sessionId: 's-cap',
      task: 't',
      target: 'Chess',
      agent: looping({ kind: 'wait', ms: 1 }),
      helper: mockHelper,
      maxSteps: 3,
      settleMs: 0
    })

    expect(res.outcome).toBe('failed')
    expect(res.steps).toBe(3)
    expect(res.summary).toMatch(/step limit/i)
  })
})

describe('runComputerSession — abort', () => {
  it('returns aborted when the AbortSignal fires mid-loop', async () => {
    const controller = new AbortController()

    const res = await runComputerSession({
      sessionId: 's-abort',
      task: 't',
      target: 'Chess',
      agent: looping({ kind: 'click', to: [1, 1] }),
      helper: mockHelper,
      signal: controller.signal,
      settleMs: 0,
      onUpdate: (u) => {
        if (u.step === 2 && u.action) controller.abort()
      }
    })

    expect(res.outcome).toBe('aborted')
  })

  it('returns aborted when the guard is tripped mid-loop', async () => {
    const guard = new Guard()

    const res = await runComputerSession({
      sessionId: 's-abort-guard',
      task: 't',
      target: 'Chess',
      agent: looping({ kind: 'click', to: [1, 1] }),
      helper: mockHelper,
      guard,
      settleMs: 0,
      onUpdate: (u) => {
        if (u.step === 2 && u.action) guard.abort('user')
      }
    })

    expect(res.outcome).toBe('aborted')
  })
})

describe('runComputerSession — askHuman', () => {
  it('suspends, then feeds the answer into the next state as humanNote', async () => {
    const agent = new ScriptedAgent([
      { kind: 'askHuman', question: 'code?' },
      { kind: 'done', success: true, summary: 'done' }
    ])
    let askedQuestion: string | undefined

    const res = await runComputerSession({
      sessionId: 's-ask',
      task: 't',
      target: 'Chess',
      agent,
      helper: mockHelper,
      settleMs: 0,
      onUpdate: (u) => {
        if (u.awaitingHuman) {
          askedQuestion = u.awaitingHuman.question
          setTimeout(() => computerAskRegistry.resolve('s-ask', '123456'), 0)
        }
      }
    })

    expect(askedQuestion).toBe('code?')
    expect(res.outcome).toBe('success')
    expect(agent.seen).toHaveLength(2)
    expect(agent.seen[0].humanNote).toBeUndefined()
    expect(agent.seen[1].humanNote).toBe('123456')
  })

  it('returns abandoned when nobody answers before the timeout', async () => {
    const res = await runComputerSession({
      sessionId: 's-abandon',
      task: 't',
      target: 'Chess',
      agent: new ScriptedAgent([{ kind: 'askHuman', question: 'code?' }]),
      helper: mockHelper,
      settleMs: 0,
      askHumanTimeoutMs: 5
    })

    expect(res.outcome).toBe('abandoned')
  })
})

describe('runComputerSession — stuck', () => {
  it('asks for guidance once, then ends stuck on the second frozen frame', async () => {
    let asked = 0

    const res = await runComputerSession({
      sessionId: 's-stuck',
      task: 't',
      target: 'Chess',
      agent: looping({ kind: 'click', to: [5, 5] }),
      helper: mockHelper,
      settleMs: 0,
      onUpdate: (u) => {
        if (u.awaitingHuman) {
          asked += 1
          setTimeout(
            () => computerAskRegistry.resolve('s-stuck', 'keep going'),
            0
          )
        }
      }
    })

    expect(asked).toBe(1)
    expect(res.outcome).toBe('stuck')
  })

  it('never trips stuck while the agent is legitimately waiting', async () => {
    const res = await runComputerSession({
      sessionId: 's-wait',
      task: 't',
      target: 'Chess',
      agent: looping({ kind: 'wait', ms: 1 }),
      helper: mockHelper,
      maxSteps: 8,
      settleMs: 0,
      onUpdate: (u) => {
        if (u.awaitingHuman) throw new Error('should not ask on a wait streak')
      }
    })

    expect(res.outcome).toBe('failed')
  })
})

describe('runComputerSession — resilience', () => {
  it('fails (not throws) when the target window cannot be resolved', async () => {
    mockHelper.__setWindows([])

    const res = await runComputerSession({
      sessionId: 's-notarget',
      task: 't',
      target: 'Nonexistent',
      agent: looping({ kind: 'wait', ms: 1 }),
      helper: mockHelper,
      settleMs: 0
    })

    expect(res.outcome).toBe('failed')
    expect(res.summary).toMatch(/nonexistent/i)
    expect(res.steps).toBe(0)
  })

  it('fails when the target window vanishes mid-session', async () => {
    const res = await runComputerSession({
      sessionId: 's-gone',
      task: 't',
      target: 'Chess',
      agent: looping({ kind: 'wait', ms: 1 }),
      helper: mockHelper,
      settleMs: 0,
      onUpdate: (u) => {
        if (u.step === 1 && u.action) mockHelper.__setWindows([])
      }
    })

    expect(res.outcome).toBe('failed')
    expect(res.summary).toMatch(/gone/i)
  })

  it('skips an out-of-bounds coordinate without ending the session', async () => {
    const agent = new ScriptedAgent([
      { kind: 'click', to: [9000, 9000] },
      { kind: 'done', success: true, summary: 'recovered' }
    ])

    const res = await runComputerSession({
      sessionId: 's-oob',
      task: 't',
      target: 'Chess',
      agent,
      helper: mockHelper,
      settleMs: 0
    })

    expect(res.outcome).toBe('success')
    expect(res.summary).toBe('recovered')
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      'computer',
      expect.stringContaining('out of bounds'),
      expect.objectContaining({ step: 1 })
    )
    // nothing was sent to the helper for the bad click
    expect(mockHelper.sent).toHaveLength(0)
  })

  it('fails when a step exceeds the step timeout', async () => {
    const res = await runComputerSession({
      sessionId: 's-timeout',
      task: 't',
      target: 'Chess',
      agent: { nextAction: () => new Promise(() => {}) },
      helper: mockHelper,
      settleMs: 0,
      stepTimeoutMs: 5
    })

    expect(res.outcome).toBe('failed')
    expect(res.summary).toMatch(/timed out/i)
  })
})

describe('runComputerSession — updates', () => {
  it('always emits a terminal outcome update', async () => {
    const updates: string[] = []

    await runComputerSession({
      sessionId: 's-updates',
      task: 't',
      target: 'Chess',
      agent: new ScriptedAgent([
        { kind: 'done', success: true, summary: 'ok' }
      ]),
      helper: mockHelper,
      settleMs: 0,
      onUpdate: (u) => {
        if (u.outcome) updates.push(u.outcome)
      }
    })

    expect(updates).toEqual(['success'])
  })
})
