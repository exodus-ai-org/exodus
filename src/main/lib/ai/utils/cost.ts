import type { Model, Usage } from '@mariozechner/pi-ai'

export interface CostBreakdown {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  total: number
}

/**
 * Calculate the cost of a single LLM request based on usage tokens and model rates.
 * Returns cost in USD. Model.cost rates are per 1M tokens.
 */
export function calculateCost(
  usage: Usage | undefined,
  model: Model<string> | undefined
): CostBreakdown {
  const zero: CostBreakdown = {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    total: 0
  }
  if (!usage || !model?.cost) return zero

  const rate = model.cost
  const input = ((usage.input ?? 0) / 1_000_000) * (rate.input ?? 0)
  const output = ((usage.output ?? 0) / 1_000_000) * (rate.output ?? 0)
  const cacheRead = ((usage.cacheRead ?? 0) / 1_000_000) * (rate.cacheRead ?? 0)
  const cacheWrite =
    ((usage.cacheWrite ?? 0) / 1_000_000) * (rate.cacheWrite ?? 0)
  const total = input + output + cacheRead + cacheWrite

  return { input, output, cacheRead, cacheWrite, total }
}
