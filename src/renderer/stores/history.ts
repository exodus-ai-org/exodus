import { atom } from 'jotai'

import { EMPTY_HISTORY, type RouteHistory } from '@/lib/route-history'

/** The pages this window showed, for the header's `←` `→` (`hooks/use-route-history.ts`). */
export const historyAtom = atom<RouteHistory>(EMPTY_HISTORY)
