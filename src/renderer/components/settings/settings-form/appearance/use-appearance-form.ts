import {
  AppearanceSchema,
  type Appearance,
  type UseFormReturnType
} from '@exodus/shared/schemas/settings-schema'
import {
  normalizeAppearance,
  resolveAppearance
} from '@exodus/shared/utils/appearance'
import { useCallback, useEffect, useMemo } from 'react'

import { applyAppearance } from '@/lib/appearance'

/**
 * The Appearance page's view of `settings.appearance`: always a complete,
 * normalised object (null / partial rows from older installs are filled with
 * defaults), and one `update()` that writes the WHOLE object back so a preset
 * pick — four fields — is a single autosave.
 *
 * The live form value is applied to the document immediately (so a slider
 * drag previews without waiting for the debounced save); `AppearanceProvider`
 * re-applies the persisted value once the save lands, which is a no-op when
 * they match.
 */
export function useAppearanceForm(form: UseFormReturnType) {
  const raw = form.watch('appearance')
  const appearance = useMemo(() => normalizeAppearance(raw), [raw])

  useEffect(() => {
    applyAppearance(resolveAppearance(appearance))
  }, [appearance])

  const update = useCallback(
    (patch: Partial<Appearance>) => {
      form.setValue(
        'appearance',
        AppearanceSchema.parse({ ...appearance, ...patch }),
        { shouldDirty: true }
      )
    },
    [form, appearance]
  )
  return { appearance, update }
}
