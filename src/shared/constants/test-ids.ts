/**
 * Stable, semantic test ids ("checkpoints") for key interactive elements.
 *
 * Single source of truth: components apply these via `data-testid={TEST_IDS.…}`
 * and Playwright tests reference the same constants via `getByTestId(...)`.
 * The value mirrors the object path (camelCase → kebab-case), e.g.
 * `TEST_IDS.lock.pinInput` → `'lock.pin-input'`. Ids are a durable contract:
 * once added, do not rename or regenerate them. The linkage test
 * (`test-ids.linkage.test.ts`) enforces that every id is applied in source and
 * referenced by a test.
 */
export const TEST_IDS = {
  lock: {
    pinInput: 'lock.pin-input',
    touchIdButton: 'lock.touch-id-button',
    enablePinInput: 'lock.enable-pin-input',
    confirmPinInput: 'lock.confirm-pin-input',
    idleSelect: 'lock.idle-select',
    removeButton: 'lock.remove-button',
    removePinInput: 'lock.remove-pin-input'
  },
  gallery: {
    thumbnail: 'gallery.thumbnail',
    lightboxClose: 'gallery.lightbox-close',
    lightboxPrev: 'gallery.lightbox-prev',
    lightboxNext: 'gallery.lightbox-next'
  }
} as const

export interface FlatTestId {
  /** Source token, e.g. "TEST_IDS.lock.pinInput". */
  accessor: string
  /** Attribute value, e.g. "lock.pin-input". */
  value: string
}

/** Flatten the nested registry into accessor/value pairs for tooling. */
export function flattenTestIds(
  node: Record<string, unknown> = TEST_IDS,
  prefix = 'TEST_IDS'
): FlatTestId[] {
  const out: FlatTestId[] = []
  for (const [key, val] of Object.entries(node)) {
    const accessor = `${prefix}.${key}`
    if (typeof val === 'string') {
      out.push({ accessor, value: val })
    } else if (val && typeof val === 'object') {
      out.push(...flattenTestIds(val as Record<string, unknown>, accessor))
    }
  }
  return out
}
