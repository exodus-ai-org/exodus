import type { Model } from '@earendil-works/pi-ai'
import { expandQuery } from '@main/lib/ai/utils/query-expansion'
import { afterEach, describe, expect, it, vi } from 'vitest'

const completeSimple = vi.fn()
vi.mock('@main/lib/ai/kernel/models', () => ({
  getKernelModels: () => ({
    completeSimple: (...args: unknown[]) => completeSimple(...args)
  })
}))

const model = {} as Model<string>
const reply = (text: string) => ({ content: [{ type: 'text', text }] })

afterEach(() => completeSimple.mockReset())

describe('expandQuery', () => {
  it('returns up to 2 deduped variants, dropping the original', async () => {
    completeSimple.mockResolvedValue(
      reply(
        '["rust async runtime", "tokio vs async-std", "rust ASYNC RUNTIME"]'
      )
    )
    const out = await expandQuery('rust async runtime', model, 'k')
    expect(out).toEqual(['tokio vs async-std'])
  })

  it('parses a fenced / prose-wrapped array', async () => {
    completeSimple.mockResolvedValue(
      reply('Sure:\n```json\n["a phrasing", "b phrasing"]\n```')
    )
    expect(await expandQuery('q', model, 'k')).toEqual([
      'a phrasing',
      'b phrasing'
    ])
  })

  it('returns [] on a non-array / unparseable reply', async () => {
    completeSimple.mockResolvedValue(reply('no json here'))
    expect(await expandQuery('q', model, 'k')).toEqual([])
  })

  it('returns [] when the LLM call throws', async () => {
    completeSimple.mockRejectedValue(new Error('boom'))
    expect(await expandQuery('q', model, 'k')).toEqual([])
  })
})
