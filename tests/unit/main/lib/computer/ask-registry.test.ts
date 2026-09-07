import { computerAskRegistry } from '@main/lib/computer/ask-registry'
import { describe, expect, it } from 'vitest'

describe('computerAskRegistry', () => {
  it('wait resolves with the answer passed to resolve', async () => {
    const pending = computerAskRegistry.wait('s1')
    computerAskRegistry.resolve('s1', 'the answer')
    await expect(pending).resolves.toBe('the answer')
  })

  it('has is true while a question is pending and false after it resolves', async () => {
    const pending = computerAskRegistry.wait('s2')
    expect(computerAskRegistry.has('s2')).toBe(true)
    computerAskRegistry.resolve('s2', 'x')
    await pending
    expect(computerAskRegistry.has('s2')).toBe(false)
  })

  it('resolve on an unknown session id is a silent no-op', () => {
    expect(() =>
      computerAskRegistry.resolve('never-registered', 'x')
    ).not.toThrow()
  })

  it('a second resolve for the same session id is a no-op', async () => {
    const pending = computerAskRegistry.wait('s3')
    computerAskRegistry.resolve('s3', 'first')
    await expect(pending).resolves.toBe('first')
    expect(() => computerAskRegistry.resolve('s3', 'second')).not.toThrow()
    expect(computerAskRegistry.has('s3')).toBe(false)
  })
})
