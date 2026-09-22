import type { AgentTool } from '@earendil-works/pi-agent-core'
import {
  Type,
  fauxProvider,
  type FauxProviderHandle,
  type RegisterFauxProviderOptions
} from '@earendil-works/pi-ai'
import { TOOL_NAMES } from '@exodus/shared/constants/tool-names'

import { getKernelModels } from './models'

/**
 * pi's scripted provider, registered on the kernel's collection. Unit tests
 * script replies with `setResponses([...])`; the Electron e2e registers it at
 * boot when `EXODUS_FAUX_PROVIDER=1` (`faux-boot.ts`).
 */
export function registerFauxProvider(
  options?: RegisterFauxProviderOptions
): FauxProviderHandle {
  const handle = fauxProvider(options)
  getKernelModels().setProvider(handle.provider)
  return handle
}

// ── The e2e switch's state, kept free of the logger so the modules that
// consult it (model resolution, tool binding) import nothing Electron-bound.

let booted: FauxProviderHandle | null = null

/** The handle `faux-boot.ts` registered, while the e2e's provider is on. */
export function fauxHandle(): FauxProviderHandle | null {
  return booted
}

export function setFauxHandle(handle: FauxProviderHandle | null): void {
  booted = handle
}

const weatherSchema = Type.Object({ location: Type.String() })

/** Stands in for the real `weather` tool (wttr.in) while the faux provider is on. */
export const fauxWeatherTool: AgentTool<typeof weatherSchema> = {
  name: TOOL_NAMES.weather,
  label: 'Weather',
  description: 'Current weather for a location (faux).',
  parameters: weatherSchema,
  execute: async (_toolCallId, { location }) => ({
    content: [{ type: 'text', text: `sunny in ${location}` }],
    details: { location, faux: true }
  })
}
