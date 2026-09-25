import type { SyntheticEvent } from 'react'

/**
 * Whether a click came from real input (the OS's pointer or keyboard), not
 * from a script in the page calling `el.click()` / `dispatchEvent`. Guards
 * the approval card's Allow button. It does not tell a person from input the
 * OS synthesized (Accessibility, CGEvent) — those arrive as trusted events —
 * see docs/security-hardening.md.
 */
export function isTrustedActivation(event: SyntheticEvent): boolean {
  return event.nativeEvent.isTrusted
}
