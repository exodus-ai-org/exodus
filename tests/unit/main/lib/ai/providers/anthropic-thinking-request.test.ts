import type { ThinkingLevel } from '@earendil-works/pi-ai'
import { streamFn } from '@main/lib/ai/kernel/models'
import { resolveModel } from '@main/lib/ai/providers/resolve-model'
import { describe, expect, it } from 'vitest'

// The request pi-ai builds for a resolved model, captured through its
// `onPayload` hook; a fake fetch answers so nothing reaches the network.
async function payloadFor(
  id: string,
  reasoning: ThinkingLevel | undefined
): Promise<Record<string, unknown>> {
  const model = resolveModel(
    'anthropic',
    id,
    'https://api.anthropic.com',
    'anthropic-messages',
    {
      contextWindow: 1_000_000,
      maxOutputTokens: 128_000,
      reasoningLevels: ['off', 'low', 'medium', 'high', 'xhigh', 'max'],
      cost: { input: 5, output: 25 }
    }
  )
  let payload: Record<string, unknown> | undefined
  const stream = await streamFn(
    model,
    { messages: [{ role: 'user', content: 'hi', timestamp: Date.now() }] },
    {
      apiKey: 'sk-ant-test',
      reasoning,
      onPayload: (p) => {
        payload = p as Record<string, unknown>
        return undefined
      },
      fetch: async () =>
        new Response(
          JSON.stringify({
            type: 'error',
            error: { type: 'invalid_request_error', message: 'stub' }
          }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        )
    }
  )
  await stream.result()
  expect(payload).toBeDefined()
  return payload!
}

/** The effort pi-ai sends: top-level, or on the trailing per-message config. */
function effortOf(payload: Record<string, unknown>): unknown {
  const messages = payload.messages as {
    role: string
    output_config?: { effort: string }
  }[]
  const last = messages.at(-1)
  return last?.role === 'system'
    ? last.output_config?.effort
    : (payload.output_config as { effort?: string } | undefined)?.effort
}

describe('Anthropic thinking request', () => {
  it('sends adaptive thinking with an effort, never budget_tokens, for Opus 5 at high', async () => {
    const payload = await payloadFor('claude-opus-5', 'high')
    expect(payload.thinking).toMatchObject({ type: 'adaptive' })
    expect(payload.thinking).not.toHaveProperty('budget_tokens')
    expect(effortOf(payload)).toBe('high')
  })

  it('sends adaptive thinking at low, never "disabled", for Opus 5 with reasoning off', async () => {
    const payload = await payloadFor('claude-opus-5', undefined)
    expect(payload.thinking).toMatchObject({ type: 'adaptive' })
    expect(effortOf(payload)).toBe('low')
  })

  it('sends adaptive thinking for an unregistered adaptive-only id', async () => {
    const payload = await payloadFor('claude-opus-5-5', 'max')
    expect(payload.thinking).toMatchObject({ type: 'adaptive' })
    expect(payload.output_config).toEqual({ effort: 'max' })
  })

  it('keeps budget thinking for Haiku 4.5', async () => {
    const payload = await payloadFor('claude-haiku-4-5', 'high')
    expect(payload.thinking).toMatchObject({ type: 'enabled' })
    expect(payload.thinking).toHaveProperty('budget_tokens')
  })
})
