import { AbortedByUser, Guard, OutOfBounds } from '@main/lib/computer/guard'
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

describe('Guard.aborted', () => {
  it('reflects the abort state', () => {
    const g = new Guard()
    expect(g.aborted).toBe(false)
    g.abort('hotkey')
    expect(g.aborted).toBe(true)
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
