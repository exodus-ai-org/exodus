// `streamFn` is what every Agent / agentLoop streams through, and pi keeps
// only the message of what it throws. The Error is logged here first.
import { fauxAssistantMessage, fauxText } from '@earendil-works/pi-ai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const error = vi.fn()
vi.mock('@main/lib/logger', () => ({
  logger: { error, warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}))

const { registerFauxProvider } = await import('@main/lib/ai/kernel/faux')
const { getKernelModels, streamFn } = await import('@main/lib/ai/kernel/models')

const CONTEXT = {
  messages: [{ role: 'user' as const, content: 'hi', timestamp: 1 }]
}

beforeEach(() => error.mockClear())
afterEach(() => vi.restoreAllMocks())

describe('streamFn', () => {
  it('logs nothing when the stream starts', async () => {
    const faux = registerFauxProvider()
    faux.setResponses([fauxAssistantMessage([fauxText('hello')])])
    const stream = await streamFn(faux.getModel(), CONTEXT, { apiKey: 'k' })
    await stream.result()
    await vi.dynamicImportSettled()
    expect(error).not.toHaveBeenCalled()
  })

  it('logs what it throws as the Error, with the provider and the model, and throws it on', async () => {
    const faux = registerFauxProvider()
    const model = faux.getModel()
    const thrown = new TypeError(
      "Cannot read properties of undefined (reading 'totalTokens')"
    )
    vi.spyOn(getKernelModels(), 'streamSimple').mockImplementation(() => {
      throw thrown
    })

    expect(() => streamFn(model, CONTEXT, { apiKey: 'k' })).toThrow(thrown)

    // The logger is imported when there is something to log.
    await vi.waitFor(() => expect(error).toHaveBeenCalledTimes(1))
    expect(error).toHaveBeenCalledWith('kernel', 'streamFn threw', {
      provider: model.provider,
      model: model.id,
      error: thrown
    })
    // Never the request: no key, no messages.
    expect(JSON.stringify(error.mock.calls)).not.toContain('"apiKey"')
  })
})
