import {
  fauxProvider,
  type FauxProviderHandle,
  type RegisterFauxProviderOptions
} from '@earendil-works/pi-ai'

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
