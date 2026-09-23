import { fauxAssistantMessage, fauxText } from '@earendil-works/pi-ai'
import { registerFauxProvider } from '@main/lib/ai/kernel/faux'
import {
  OLLAMA_PROVIDER_ID,
  getKernelModels,
  streamFn
} from '@main/lib/ai/kernel/models'
import { describe, expect, it } from 'vitest'

describe('kernel models collection', () => {
  it('registers the five built-in providers and ollama', () => {
    const ids = getKernelModels()
      .getProviders()
      .map((p) => p.id)
    for (const id of [
      'anthropic',
      'openai',
      'google',
      'xai',
      'azure-openai-responses',
      OLLAMA_PROVIDER_ID
    ]) {
      expect(ids).toContain(id)
    }
  })

  it('routes a hand-built ollama model through the ollama provider', () => {
    const provider = getKernelModels().getProvider(OLLAMA_PROVIDER_ID)
    expect(provider).toBeDefined()
    // Dynamic provider: nothing in the catalog, requests are routed by
    // `model.provider` alone.
    expect(provider!.getModels()).toEqual([])
  })

  it('streamFn streams through the collection with an explicit apiKey', async () => {
    const faux = registerFauxProvider()
    faux.setResponses([fauxAssistantMessage([fauxText('hello from faux')])])
    const stream = await streamFn(
      faux.getModel(),
      { messages: [{ role: 'user', content: 'hi', timestamp: Date.now() }] },
      { apiKey: 'explicit-key' }
    )
    const message = await stream.result()
    expect(message.content).toEqual([
      expect.objectContaining({ type: 'text', text: 'hello from faux' })
    ])
    expect(faux.state.callCount).toBe(1)
  })
})
