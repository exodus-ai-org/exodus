import type { Model } from '@earendil-works/pi-ai'

import { fauxHandle } from '../ai/kernel/faux'
import { aiProviderOf, providerBaseUrl } from '../ai/providers'
import type { Settings } from '../db/schema'
import { normalizeBaseUrl } from '../secrets'
import { PROVIDER_KEY_FIELD } from '../secrets/registry'

/**
 * The API key a post-run job uses, read from settings when the job runs —
 * never carried in its payload (ledger ruling R3): a pgmq row lives in PGlite
 * until it is processed, and a job given up on is archived until the next
 * launch.
 *
 * `null` when there is none to use: no key saved for the model's provider, or
 * the provider's destination is no longer the host the job's model was built
 * for (a key saved for one host is never sent to another).
 */
export function jobApiKey(
  model: Model<string>,
  settings: Settings
): string | null {
  const faux = fauxHandle()
  if (faux && model.provider === faux.getModel().provider) return 'faux'
  if (model.provider === 'ollama') return 'ollama'

  const provider = aiProviderOf(model.provider)
  if (!provider) return null
  const providers = settings.providers as Record<string, unknown> | null
  const key = providers?.[PROVIDER_KEY_FIELD[provider]]
  if (typeof key !== 'string' || !key) return null
  if (
    normalizeBaseUrl(model.baseUrl) !==
    normalizeBaseUrl(providerBaseUrl(provider, settings))
  ) {
    return null
  }
  return key
}
