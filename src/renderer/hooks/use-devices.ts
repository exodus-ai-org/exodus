import {
  type Query,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'

import { i18n } from '@/lib/i18n'
import {
  cancelPairing,
  type DevicesState,
  getDevices,
  openPairing,
  resetDevices,
  revokeDevice
} from '@/services/devices'

export const devicesKeys = { all: ['devices'] as const }

// While a pairing window is open the page polls: that is how it learns the
// phone has paired.
const PAIRING_POLL_MS = 1500
// The header's phone dot watches a phone's `lastSeenAt`, which the phone
// changes by calling the LAN API while this window may stay focused for
// hours: a minute's poll of a loopback route, only where asked for.
const PRESENCE_POLL_MS = 60_000

const pollInterval =
  (watchPresence: boolean) => (query: Query<DevicesState>) => {
    if (query.state.data?.pairing) return PAIRING_POLL_MS
    return watchPresence ? PRESENCE_POLL_MS : false
  }

// `data` keeps its identity across polls that return equal data (structural
// sharing — never turn it off): the "device paired" toast is an effect over it.
export function useDevices({
  watchPresence = false
}: {
  /** Re-read once a minute even with no pairing window: the header's phone dot. */
  watchPresence?: boolean
} = {}) {
  const { data } = useQuery({
    queryKey: devicesKeys.all,
    queryFn: () => getDevices(),
    refetchInterval: pollInterval(watchPresence),
    // The QR code is scanned from a phone, so this window is usually blurred
    // when the "device paired" toast has to land, and React Query would pause
    // the interval on blur. The poll ends when a read shows `pairing: null`
    // (the main process closes the window after PAIRING_TTL_MS) or when the
    // page unmounts, which is what a lock mid-window does.
    refetchIntervalInBackground: true,
    // A paired phone's `lastSeenAt` changes without the desktop's involvement
    // (the phone calls the LAN API); coming back to the window is when the
    // user would look. Off app-wide (settings autosave), on for this read.
    refetchOnWindowFocus: true
  })
  return { data }
}

// Returned, not voided: the mutation then settles after the mounted list has
// re-read. Called from `onSettled`, not `onSuccess`: the server may have
// changed before a write failed.
const refreshDevices = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: devicesKeys.all })

// No success toast on any of these: the page changing is the confirmation. The
// global mutation handler is the only error surface — a local catch and toast
// would make one failed write toast twice.
export function useOpenPairing() {
  const queryClient = useQueryClient()
  return useMutation({
    // Bare call: React Query would hand the service (variables, context).
    mutationFn: () => openPairing(),
    meta: { errorTitle: i18n.t('settings:devices.toast.failedTitle') },
    onSettled: () => refreshDevices(queryClient)
  })
}

export function useCancelPairing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => cancelPairing(),
    meta: { errorTitle: i18n.t('settings:devices.toast.failedTitle') },
    onSettled: () => refreshDevices(queryClient)
  })
}

export function useRevokeDevice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => revokeDevice(id),
    meta: { errorTitle: i18n.t('settings:devices.toast.failedTitle') },
    onSettled: () => refreshDevices(queryClient)
  })
}

export function useResetDevices() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => resetDevices(),
    meta: { errorTitle: i18n.t('settings:devices.toast.failedTitle') },
    onSettled: () => refreshDevices(queryClient)
  })
}
