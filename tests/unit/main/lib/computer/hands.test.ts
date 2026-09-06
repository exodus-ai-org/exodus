import { KEYCODES, decompose, execute } from '@main/lib/computer/hands'
import type {
  HelperCommand,
  InputHelper,
  TargetWindow
} from '@main/lib/computer/types'
import { describe, expect, it } from 'vitest'

const target: TargetWindow = {
  cgWindowId: 1,
  app: 'Chess',
  bundleId: 'com.apple.Chess',
  title: 'Chess',
  bounds: [12, 40, 800, 600]
}

function recordingHelper(): {
  helper: InputHelper
  calls: Array<{
    commands: HelperCommand[]
    clamp?: [number, number, number, number]
  }>
} {
  const calls: Array<{
    commands: HelperCommand[]
    clamp?: [number, number, number, number]
  }> = []
  const helper: InputHelper = {
    async listWindows() {
      return []
    },
    async screenshot() {
      return Buffer.alloc(0)
    },
    async send(commands, clamp) {
      calls.push({ commands, clamp })
    }
  }
  return { helper, calls }
}

describe('decompose — atoms', () => {
  it('click at scaleFactor 1 (screenshot pixels line up with window points) adds the window origin and emits move,down,up', () => {
    expect(decompose({ kind: 'click', to: [100, 50] }, 1, [0, 38])).toEqual([
      { op: 'move', x: 100, y: 88 },
      { op: 'down', button: 'left' },
      { op: 'up', button: 'left' }
    ])
  })

  it('click at scaleFactor 0.5 (a downscaled large window — coordinate grows) scales it back up', () => {
    expect(decompose({ kind: 'click', to: [100, 50] }, 0.5, [0, 0])).toEqual([
      { op: 'move', x: 200, y: 100 },
      { op: 'down', button: 'left' },
      { op: 'up', button: 'left' }
    ])
  })

  it('click combines a fractional scaleFactor with a non-zero origin (rounded)', () => {
    // coord / scaleFactor, then + origin: 100 / 0.6 = 166.66… → 167 ; 50 / 0.6 = 83.33… → 83
    expect(decompose({ kind: 'click', to: [100, 50] }, 0.6, [10, 20])).toEqual([
      { op: 'move', x: 177, y: 103 },
      { op: 'down', button: 'left' },
      { op: 'up', button: 'left' }
    ])
  })

  it('click honours button and count', () => {
    expect(
      decompose(
        { kind: 'click', to: [0, 0], button: 'right', count: 2 },
        1,
        [0, 0]
      )
    ).toEqual([
      { op: 'move', x: 0, y: 0 },
      { op: 'down', button: 'right' },
      { op: 'up', button: 'right' },
      { op: 'down', button: 'right' },
      { op: 'up', button: 'right' }
    ])
  })

  it('type emits a key down/up pair per character and carries no coordinates', () => {
    expect(decompose({ kind: 'type', text: 'hi' }, 0.5, [999, 999])).toEqual([
      { op: 'key', code: KEYCODES.h, down: true },
      { op: 'key', code: KEYCODES.h, down: false },
      { op: 'key', code: KEYCODES.i, down: true },
      { op: 'key', code: KEYCODES.i, down: false }
    ])
  })

  it('type wraps an uppercase letter in shift', () => {
    expect(decompose({ kind: 'type', text: 'A' }, 1, [0, 0])).toEqual([
      { op: 'key', code: KEYCODES.shift, down: true },
      { op: 'key', code: KEYCODES.a, down: true },
      { op: 'key', code: KEYCODES.a, down: false },
      { op: 'key', code: KEYCODES.shift, down: false }
    ])
  })

  it('type handles spaces and digits', () => {
    expect(decompose({ kind: 'type', text: '1 2' }, 1, [0, 0])).toEqual([
      { op: 'key', code: KEYCODES['1'], down: true },
      { op: 'key', code: KEYCODES['1'], down: false },
      { op: 'key', code: KEYCODES.space, down: true },
      { op: 'key', code: KEYCODES.space, down: false },
      { op: 'key', code: KEYCODES['2'], down: true },
      { op: 'key', code: KEYCODES['2'], down: false }
    ])
  })

  it('drag emits move→from, down(left), move→to, up(left)', () => {
    expect(
      decompose({ kind: 'drag', from: [10, 10], to: [90, 90] }, 1, [0, 0])
    ).toEqual([
      { op: 'move', x: 10, y: 10 },
      { op: 'down', button: 'left' },
      { op: 'move', x: 90, y: 90 },
      { op: 'up', button: 'left' }
    ])
  })

  it('hotkey presses modifiers in order, taps the key, releases modifiers reversed', () => {
    expect(decompose({ kind: 'hotkey', combo: 'cmd+c' }, 1, [0, 0])).toEqual([
      { op: 'key', code: KEYCODES.cmd, down: true },
      { op: 'key', code: KEYCODES.c, down: true },
      { op: 'key', code: KEYCODES.c, down: false },
      { op: 'key', code: KEYCODES.cmd, down: false }
    ])
  })

  it('hotkey with multiple modifiers releases them in reverse order', () => {
    expect(
      decompose({ kind: 'hotkey', combo: 'cmd+shift+c' }, 1, [0, 0])
    ).toEqual([
      { op: 'key', code: KEYCODES.cmd, down: true },
      { op: 'key', code: KEYCODES.shift, down: true },
      { op: 'key', code: KEYCODES.c, down: true },
      { op: 'key', code: KEYCODES.c, down: false },
      { op: 'key', code: KEYCODES.shift, down: false },
      { op: 'key', code: KEYCODES.cmd, down: false }
    ])
  })

  it('hotkey accepts modifier aliases and is case-insensitive', () => {
    expect(
      decompose({ kind: 'hotkey', combo: 'Ctrl+Alt+Tab' }, 1, [0, 0])
    ).toEqual([
      { op: 'key', code: KEYCODES.control, down: true },
      { op: 'key', code: KEYCODES.option, down: true },
      { op: 'key', code: KEYCODES.tab, down: true },
      { op: 'key', code: KEYCODES.tab, down: false },
      { op: 'key', code: KEYCODES.option, down: false },
      { op: 'key', code: KEYCODES.control, down: false }
    ])
  })

  it('hotkey throws on an unknown key name', () => {
    expect(() =>
      decompose({ kind: 'hotkey', combo: 'cmd+💥' }, 1, [0, 0])
    ).toThrow()
  })
})

describe('decompose — primitives', () => {
  it('moveMouse emits a single terminal move', () => {
    expect(
      decompose(
        { kind: 'moveMouse', to: [100, 50], durationMs: 250 },
        0.5,
        [10, 20]
      )
    ).toEqual([{ op: 'move', x: 210, y: 120 }])
  })

  it('mouseDown / mouseUp pass the button through', () => {
    expect(
      decompose({ kind: 'mouseDown', button: 'middle' }, 1, [0, 0])
    ).toEqual([{ op: 'down', button: 'middle' }])
    expect(decompose({ kind: 'mouseUp', button: 'left' }, 1, [0, 0])).toEqual([
      { op: 'up', button: 'left' }
    ])
  })

  it('wheel passes dx/dy through', () => {
    expect(decompose({ kind: 'wheel', dx: 0, dy: -3 }, 1, [0, 0])).toEqual([
      { op: 'wheel', dx: 0, dy: -3 }
    ])
  })

  it('keyDown / keyUp resolve the key name (case-insensitive) to a keycode', () => {
    expect(decompose({ kind: 'keyDown', key: 'Enter' }, 1, [0, 0])).toEqual([
      { op: 'key', code: KEYCODES.return, down: true }
    ])
    expect(decompose({ kind: 'keyUp', key: 'a' }, 1, [0, 0])).toEqual([
      { op: 'key', code: KEYCODES.a, down: false }
    ])
  })
})

describe('decompose — non-executable kinds', () => {
  for (const action of [
    { kind: 'wait', ms: 10 },
    { kind: 'askHuman', question: 'x' },
    { kind: 'done', success: true, summary: 's' }
  ] as const) {
    it(`throws for ${action.kind}`, () => {
      expect(() => decompose(action, 1, [0, 0])).toThrow()
    })
  }
})

describe('execute', () => {
  it('sends the decomposed commands with the window bounds as the clamp', async () => {
    const { helper, calls } = recordingHelper()
    await execute(
      { kind: 'click', to: [100, 50] },
      { target, scaleFactor: 1, helper }
    )
    expect(calls).toHaveLength(1)
    expect(calls[0].commands).toEqual([
      { op: 'move', x: 112, y: 90 },
      { op: 'down', button: 'left' },
      { op: 'up', button: 'left' }
    ])
    expect(calls[0].clamp).toEqual([12, 40, 800, 600])
  })

  it('wait sleeps and never calls the helper', async () => {
    const { helper, calls } = recordingHelper()
    await execute({ kind: 'wait', ms: 1 }, { target, scaleFactor: 1, helper })
    expect(calls).toHaveLength(0)
  })

  it('throws for askHuman and done', async () => {
    const { helper } = recordingHelper()
    await expect(
      execute(
        { kind: 'askHuman', question: 'x' },
        { target, scaleFactor: 1, helper }
      )
    ).rejects.toThrow('not an executable action')
    await expect(
      execute(
        { kind: 'done', success: true, summary: 's' },
        { target, scaleFactor: 1, helper }
      )
    ).rejects.toThrow('not an executable action')
  })
})
