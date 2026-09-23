import { beforeEach, describe, expect, it, vi } from 'vitest'

const piCompleteSimple = vi.fn()
vi.mock('@main/lib/ai/kernel/models', () => ({
  getKernelModels: () => ({
    completeSimple: (...args: unknown[]) => piCompleteSimple(...args)
  })
}))
vi.mock('@main/lib/ai/prompts', () => ({ titleGenerationPrompt: 'TITLE' }))
vi.mock('@main/lib/ai/utils/model-util', () => ({}))
vi.mock('@main/lib/ai/utils/tool-binding-util', () => ({}))

const { completeSimple, LlmRequestError } =
  await import('@main/lib/ai/utils/complete')
const { generateTitleFromUserMessage } =
  await import('@main/lib/ai/utils/chat-message-util')

const MODEL = { id: 'm' } as never
const CONTEXT = { messages: [] } as never

function reply(overrides: Record<string, unknown>) {
  return {
    role: 'assistant',
    content: [{ type: 'text', text: 'hello' }],
    stopReason: 'stop',
    ...overrides
  }
}

beforeEach(() => piCompleteSimple.mockReset())

describe('completeSimple', () => {
  it('passes a successful reply through, arguments untouched', async () => {
    const ok = reply({})
    piCompleteSimple.mockResolvedValue(ok)

    await expect(completeSimple(MODEL, CONTEXT, { apiKey: 'k' })).resolves.toBe(
      ok
    )
    expect(piCompleteSimple).toHaveBeenCalledWith(MODEL, CONTEXT, {
      apiKey: 'k'
    })
  })

  it.each(['length', 'toolUse'])(
    'does not treat stopReason "%s" as a failure',
    async (stopReason) => {
      piCompleteSimple.mockResolvedValue(reply({ stopReason }))
      await expect(completeSimple(MODEL, CONTEXT)).resolves.toBeDefined()
    }
  )

  // What pi-ai actually hands back for a 429 / bad key / dropped connection:
  // a resolved promise, empty content.
  it('rejects with the provider detail when the request failed', async () => {
    piCompleteSimple.mockResolvedValue(
      reply({
        content: [],
        stopReason: 'error',
        errorMessage: '429 rate limit exceeded'
      })
    )

    const failure = completeSimple(MODEL, CONTEXT)
    await expect(failure).rejects.toBeInstanceOf(LlmRequestError)
    await expect(failure).rejects.toThrow('429 rate limit exceeded')
  })

  it('rejects when the request was aborted, even with no message', async () => {
    piCompleteSimple.mockResolvedValue(
      reply({ content: [], stopReason: 'aborted' })
    )

    await expect(completeSimple(MODEL, CONTEXT)).rejects.toMatchObject({
      name: 'LlmRequestError',
      stopReason: 'aborted'
    })
  })
})

describe('generateTitleFromUserMessage', () => {
  const message = {
    id: 'u1',
    role: 'user',
    content:
      '  How do I\n  tune Postgres autovacuum for a write-heavy table?  ',
    timestamp: 0
  } as never

  it('cleans up the model title', async () => {
    piCompleteSimple.mockResolvedValue(
      reply({ content: [{ type: 'text', text: '## "Tuning autovacuum"' }] })
    )

    await expect(
      generateTitleFromUserMessage({ message, model: MODEL, apiKey: 'k' })
    ).resolves.toBe('Tuning autovacuum')
  })

  it('falls back to the start of the message when the request fails — and never rejects', async () => {
    piCompleteSimple.mockResolvedValue(
      reply({ content: [], stopReason: 'error', errorMessage: 'bad key' })
    )

    const title = await generateTitleFromUserMessage({
      message,
      model: MODEL,
      apiKey: 'k'
    })
    expect(title).toBe(
      'How do I tune Postgres autovacuum for a write-heavy table?'
    )
  })

  it('falls back when the model answers with nothing usable', async () => {
    piCompleteSimple.mockResolvedValue(
      reply({ content: [{ type: 'text', text: '  ""  ' }] })
    )

    const title = await generateTitleFromUserMessage({
      message,
      model: MODEL,
      apiKey: 'k'
    })
    expect(title.startsWith('How do I tune Postgres')).toBe(true)
    expect(title.length).toBeLessThanOrEqual(60)
  })
})
