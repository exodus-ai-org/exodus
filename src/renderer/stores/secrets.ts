import { atom } from 'jotai'

/**
 * Settings paths of keys a save just cleared because their address moved
 * (the base URL changed while the key was a mask — the server never carries a
 * stored key to a new host). An optimistic mirror only: the server records the
 * same move in `GET /api/v1/settings/secrets-status` `needsReentry`, which is
 * what survives a restart (`src/main/lib/secrets/moved.ts`); this lets the key
 * input ask at once, before that read comes back. Typing a key takes the path
 * back out.
 */
export const clearedSecretsAtom = atom<readonly string[]>([])
