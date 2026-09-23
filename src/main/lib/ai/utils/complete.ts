import type {
  AssistantMessage,
  Context,
  Model,
  SimpleStreamOptions
} from '@earendil-works/pi-ai'

import { getKernelModels } from '../kernel/models'

/** A model request that pi-ai reported as failed or cancelled. */
export class LlmRequestError extends Error {
  constructor(
    message: string,
    readonly stopReason: 'error' | 'aborted'
  ) {
    super(message)
    this.name = 'LlmRequestError'
  }
}

/**
 * `completeSimple`, except a failed request rejects.
 *
 * pi-ai never rejects once a request is under way: a 429, an expired key, a
 * dropped connection all *resolve* — to an assistant message with
 * `stopReason: 'error'`, the detail on `errorMessage`, and empty `content`.
 * Read as text that is `''`, which every caller took for "the model had
 * nothing to say" and acted on: the Philharmonic LCM overwrote a group's
 * rolling summary with an empty string, chat LCM fell through to its
 * truncating fallback, a new chat got a blank title, deep research "completed"
 * with no findings — none of it logged. Every caller already has a `catch`
 * that does the right thing (skip, retry later, mark failed), so failing loudly
 * here is all it takes. Use this, not pi-ai's export, for one-shot completions.
 */
export async function completeSimple(
  model: Model<string>,
  context: Context,
  options?: SimpleStreamOptions
): Promise<AssistantMessage> {
  const result = await getKernelModels().completeSimple(model, context, options)
  if (result.stopReason === 'error' || result.stopReason === 'aborted') {
    throw new LlmRequestError(
      result.errorMessage ||
        `The model request ended with "${result.stopReason}".`,
      result.stopReason
    )
  }
  return result
}
