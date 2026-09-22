import {
  fauxAssistantMessage,
  fauxText,
  fauxToolCall,
  type FauxProviderHandle,
  type FauxResponseFactory
} from '@earendil-works/pi-ai'
import { TOOL_NAMES } from '@exodus/shared/constants/tool-names'

import { logger } from '../../logger'
import { fauxHandle, registerFauxProvider, setFauxHandle } from './faux'

export const FAUX_ANSWER = 'It is sunny in Oslo.'

/**
 * The Electron e2e's provider: scripted, keyless, on when
 * `EXODUS_FAUX_PROVIDER=1`. Every send gets the same two steps — a call to
 * `weather` for Oslo, then the answer — so a spec can run a whole
 * conversation with a tool call and no key. `getModelFromProvider` hands out
 * its model while it is on, and `bindCallingTools` swaps in `fauxWeatherTool`
 * so nothing reaches the network (both via `fauxHandle()` in `faux.ts`).
 */
export function bootFauxProviderIfRequested(): FauxProviderHandle | null {
  if (process.env.EXODUS_FAUX_PROVIDER !== '1') return null
  const existing = fauxHandle()
  if (existing) return existing
  const handle = registerFauxProvider({
    provider: 'faux',
    models: [{ id: 'faux-1', name: 'Faux' }]
  })
  // One factory answers every request and re-arms itself; which step it is
  // depends on whether a tool result is the last message.
  const factory: FauxResponseFactory = (ctx) => {
    handle.appendResponses([factory])
    return ctx.messages.at(-1)?.role === 'toolResult'
      ? fauxAssistantMessage([fauxText(FAUX_ANSWER)])
      : fauxAssistantMessage(
          [fauxToolCall(TOOL_NAMES.weather, { location: 'Oslo' })],
          { stopReason: 'toolUse' }
        )
  }
  handle.setResponses([factory])
  setFauxHandle(handle)
  logger.warn(
    'app',
    'Faux provider is on (EXODUS_FAUX_PROVIDER=1) — no real model is reachable'
  )
  return handle
}
