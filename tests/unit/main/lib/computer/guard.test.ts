import {
  AbortedByUser,
  ForbiddenChord,
  Guard,
  OutOfBounds
} from '@main/lib/computer/guard'
import { describe, expect, it } from 'vitest'

const vp = { width: 800, height: 600 }

describe('Guard.check', () => {
  it('clamps a slightly-out point', () => {
    const g = new Guard()
    const out = g.check({ kind: 'click', to: [810, 600] }, vp)
    expect(out).toMatchObject({ kind: 'click', to: [800, 600] })
  })

  it('rejects a wildly-out point', () => {
    const g = new Guard()
    expect(() => g.check({ kind: 'click', to: [2000, 50] }, vp)).toThrow(
      OutOfBounds
    )
  })

  it('clamps a point exactly CLAMP_SLACK (16px) out — the boundary is inclusive', () => {
    const g = new Guard()
    const out = g.check({ kind: 'click', to: [816, 600] }, vp)
    expect(out).toMatchObject({ kind: 'click', to: [800, 600] })
  })

  it('rejects a point 17px out — one past the slack', () => {
    const g = new Guard()
    expect(() => g.check({ kind: 'click', to: [817, 600] }, vp)).toThrow(
      OutOfBounds
    )
  })

  it('rejects when only the y axis is more than CLAMP_SLACK out', () => {
    const g = new Guard()
    expect(() => g.check({ kind: 'click', to: [400, 700] }, vp)).toThrow(
      OutOfBounds
    )
  })

  it('throws once aborted', () => {
    const g = new Guard()
    g.abort('user')
    expect(() => g.check({ kind: 'wait', ms: 10 }, vp)).toThrow(AbortedByUser)
  })

  it('clamps both points of a drag', () => {
    const g = new Guard()
    const out = g.check({ kind: 'drag', from: [-3, 10], to: [10, 610] }, vp)
    expect(out).toMatchObject({ from: [0, 10], to: [10, 600] })
  })

  it('clamps a slightly-out moveMouse point and keeps other fields', () => {
    const g = new Guard()
    const out = g.check(
      { kind: 'moveMouse', to: [-8, 612], durationMs: 250 },
      vp
    )
    expect(out).toMatchObject({
      kind: 'moveMouse',
      to: [0, 600],
      durationMs: 250
    })
  })

  it('returns a non-point action unchanged', () => {
    const g = new Guard()
    const action = { kind: 'type', text: 'hello' } as const
    expect(g.check(action, vp)).toEqual(action)
  })

  it('does not mutate the input action', () => {
    const g = new Guard()
    const action = { kind: 'click', to: [810, 600] as [number, number] }
    g.check(action, vp)
    expect(action.to).toEqual([810, 600])
  })
})

describe('Guard.check — forbidden chords', () => {
  it('rejects a chord that switches or quits apps', () => {
    const g = new Guard()
    expect(() => g.check({ kind: 'hotkey', combo: 'cmd+tab' }, vp)).toThrow(
      ForbiddenChord
    )
  })

  it('rejects an aliased, mixed-case spelling of the same chord', () => {
    const g = new Guard()
    expect(() => g.check({ kind: 'hotkey', combo: 'Command+Tab' }, vp)).toThrow(
      ForbiddenChord
    )
  })

  it('lets an ordinary chord through unchanged', () => {
    const g = new Guard()
    expect(g.check({ kind: 'hotkey', combo: 'cmd+c' }, vp)).toEqual({
      kind: 'hotkey',
      combo: 'cmd+c'
    })
    expect(g.check({ kind: 'hotkey', combo: 'cmd+shift+t' }, vp)).toEqual({
      kind: 'hotkey',
      combo: 'cmd+shift+t'
    })
  })
})

describe('Guard.aborted', () => {
  it('reflects the abort state', () => {
    const g = new Guard()
    expect(g.aborted).toBe(false)
    g.abort('hotkey')
    expect(g.aborted).toBe(true)
  })
})

describe('Guard.signal', () => {
  it('fires once when abort() is called', () => {
    const g = new Guard()
    expect(g.signal.aborted).toBe(false)

    let fired = 0
    g.signal.addEventListener('abort', () => {
      fired += 1
    })

    g.abort('user')
    expect(g.signal.aborted).toBe(true)
    expect(fired).toBe(1)

    // idempotent — a second abort() neither re-fires nor changes the reason
    g.abort('system')
    expect(fired).toBe(1)
  })

  it('is the same signal instance across reads', () => {
    const g = new Guard()
    expect(g.signal).toBe(g.signal)
  })
})

describe('Guard.noteFrame', () => {
  it('reports stuck after 4 identical frames', () => {
    const g = new Guard()
    expect(g.noteFrame('a')).toBe('ok')
    expect(g.noteFrame('a')).toBe('ok')
    expect(g.noteFrame('a')).toBe('ok')
    expect(g.noteFrame('a')).toBe('stuck')
    expect(g.noteFrame('b')).toBe('ok')
  })
})
