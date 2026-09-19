import { test } from '@playwright/test'

type ModelKey = 'OPENAI_API_KEY' | 'CLAUDE_API_KEY'

/**
 * Skip the current test — or the enclosing `describe`, when called at its top
 * level — unless the key is set: from `.env.test` locally, from a repo secret
 * in CI.
 *
 * Without a key the app does not fail loudly, it answers with an empty stream,
 * and some assertions even accept that ("at most 10 words"). A keyless run must
 * therefore skip rather than report green or red for a model it never reached.
 */
export function skipWithoutKey(name: ModelKey) {
  test.skip(
    !process.env[name],
    `needs ${name} (.env.test locally, a repo secret in CI)`
  )
}
