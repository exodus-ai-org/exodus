import { atom } from 'jotai'

/**
 * Settings paths of keys a save just cleared because their address moved
 * (the base URL changed while the key was a mask — the server never carries a
 * stored key to a new host). Their inputs ask for the key again; typing one
 * takes the path back out.
 */
export const clearedSecretsAtom = atom<readonly string[]>([])
