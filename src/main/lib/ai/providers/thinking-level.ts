import type {
  Model,
  SimpleStreamOptions,
  ThinkingLevel
} from '@earendil-works/pi-ai'

/**
 * The thinking level to request, given the app's choice (`undefined` is the
 * composer's "off"). On a model whose thinking can't be disabled (its level
 * map says `off: null`), "off" becomes the cheapest adaptive effort: pi-ai
 * would otherwise send no effort, which it defaults to "high" on the newest
 * Claude models, or a `{type:"disabled"}` the API rejects. Anthropic
 * recommends low effort over disabling there.
 */
export function thinkingLevelFor(
  model: Model<string> | undefined,
  level: ThinkingLevel | undefined
): ThinkingLevel | undefined {
  if (level) return level
  // No model (a caller that has not resolved one, or a test double): nothing to adjust.
  return model?.reasoning && model.thinkingLevelMap?.off === null
    ? 'low'
    : undefined
}

/**
 * `options` with `reasoning` resolved by `thinkingLevelFor` — the same object
 * when nothing changes.
 */
export function withThinkingLevel<T extends SimpleStreamOptions>(
  model: Model<string> | undefined,
  options: T | undefined
): T | undefined {
  const reasoning = thinkingLevelFor(model, options?.reasoning)
  return reasoning === options?.reasoning
    ? options
    : ({ ...options, reasoning } as T)
}
