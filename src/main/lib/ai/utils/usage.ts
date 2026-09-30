import type { Usage } from '@earendil-works/pi-ai'

const COUNTS = [
  'input',
  'output',
  'cacheRead',
  'cacheWrite',
  'totalTokens'
] as const

/**
 * The `usage` of an assistant message rebuilt from a stored row. pi requires
 * one on every assistant message in a request's context — each provider
 * estimates the context from them before it sends anything
 * (`clampMaxTokensToContext`) — so a message without it fails the request.
 * A row that recorded none, or one in another shape, gets zeros: pi reads
 * that as "nothing reported" and estimates from the text instead.
 */
export function storedUsage(usage: unknown): Usage {
  const stored = usage as Usage | null | undefined
  if (stored && COUNTS.every((key) => Number.isFinite(stored[key]))) {
    return stored
  }
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
  }
}
