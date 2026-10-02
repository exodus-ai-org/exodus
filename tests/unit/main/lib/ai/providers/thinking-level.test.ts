import {
  thinkingLevelFor,
  withThinkingLevel
} from '@main/lib/ai/providers/thinking-level'
// src/main/lib/ai/providers/thinking-level.ts — "off" on a model that can't
// disable thinking becomes low effort; everything else passes through.
import { describe, expect, it } from 'vitest'

const alwaysThinks = {
  reasoning: true,
  thinkingLevelMap: { off: null }
} as never
const canDisable = { reasoning: true, thinkingLevelMap: {} } as never

describe('thinkingLevelFor', () => {
  it('turns "off" into low effort where thinking cannot be disabled', () => {
    expect(thinkingLevelFor(alwaysThinks, undefined)).toBe('low')
    expect(thinkingLevelFor(canDisable, undefined)).toBeUndefined()
  })

  it('keeps an asked-for level', () => {
    expect(thinkingLevelFor(alwaysThinks, 'high')).toBe('high')
  })

  it('without a model, changes nothing and does not throw', () => {
    expect(thinkingLevelFor(undefined, undefined)).toBeUndefined()
    const options = { maxTokens: 10 }
    expect(withThinkingLevel(undefined, options)).toBe(options)
  })
})
