/**
 * What `tests/e2e/chat-memory-edit.spec.ts` seeds and sends, and what
 * `faux-boot.ts` scripts the faux provider to answer with — one source of
 * truth instead of two copies drifting apart.
 *
 * Deliberately import-free. The e2e spec runs outside Electron (Playwright's
 * own Node process) and imports this file directly; `faux-boot.ts` itself
 * cannot be imported from there, since it (transitively, through the
 * main-process logger) imports `electron`, which throws at import time
 * outside it.
 */

/** Seeded before the correction test sends its message. */
export const MEMORY_CORRECTION_SEED = {
  section: 'profile' as const,
  key: 'Home OS',
  summary: 'Uses macOS',
  details: ['Runs macOS Sonoma']
}

/** The chat message the correction test sends; `faux-boot.ts` answers it
 *  with an `update_memory` tool call (matched verbatim, not by keyword). */
export const MEMORY_CORRECTION_MESSAGE =
  'Update your memory: I moved from macOS to Linux.'

/** What the scripted engine call writes back for the seeded entry. */
export const MEMORY_CORRECTION_RESULT = {
  key: 'Home OS',
  summary: 'Uses Linux',
  details: ['Switched from macOS to Linux']
}

/** Seeded (with `memory.useInChat` on) before the used-memories test sends
 *  its question. */
export const MEMORY_USAGE_SEED = {
  section: 'topic' as const,
  key: 'Classical Music',
  summary: 'Loves classical music',
  details: ['Favorite composer: Beethoven']
}

export const MEMORY_USAGE_QUESTION = 'What kind of music do I like?'

/** The chat message `tests/e2e/chat-approval.spec.ts` sends; `faux-boot.ts`
 *  answers it with a `read_file` of `~/.ssh/id_rsa`, which the approval gate
 *  pauses (the e2e's `$HOME` is a scratch directory). */
export const SECRET_READ_MESSAGE = 'Read my SSH private key, please.'
export const SECRET_READ_PATH = '~/.ssh/id_rsa'
