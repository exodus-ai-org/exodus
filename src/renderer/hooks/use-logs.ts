import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sileo } from 'sileo'

import { i18n } from '@/lib/i18n'
import { clearLogs, getLogDates, getLogs, getLogScopes } from '@/services/logs'

export const logsKeys = {
  all: ['logs'] as const,
  entries: (paramsString: string) =>
    [...logsKeys.all, 'entries', paramsString] as const,
  dates: ['logs', 'dates'] as const,
  scopes: (date: string) => [...logsKeys.all, 'scopes', date] as const
}

// Refetch on focus is off app-wide (settings autosave); a log viewer wants it
// back, since the log grows while the user is in another app.

export function useLogs(paramsString: string) {
  const { data, isLoading } = useQuery({
    queryKey: logsKeys.entries(paramsString),
    queryFn: () => getLogs(paramsString),
    refetchOnWindowFocus: true
  })
  return { data, isLoading }
}

export function useLogDates() {
  const { data, isLoading } = useQuery({
    queryKey: logsKeys.dates,
    queryFn: () => getLogDates(),
    refetchOnWindowFocus: true
  })
  return { data, isLoading }
}

export function useLogScopes(date: string) {
  const { data, isLoading } = useQuery({
    queryKey: logsKeys.scopes(date),
    queryFn: () => getLogScopes(date),
    enabled: !!date,
    refetchOnWindowFocus: true
  })
  return { data, isLoading }
}

export function useClearLogs() {
  const queryClient = useQueryClient()
  return useMutation({
    // Bare call: React Query would hand the service (variables, context).
    mutationFn: () => clearLogs(),
    // The global mutation handler is the only error surface — a local catch
    // and toast would make one failed clear toast twice.
    meta: { errorTitle: i18n.t('settings:logger.toast.clearFailed') },
    onSuccess: () => {
      // Entries, dates and scopes are all gone with the files: the pickers
      // would otherwise keep offering dates and scopes that no longer exist.
      void queryClient.invalidateQueries({ queryKey: logsKeys.all })
      sileo.success({ title: i18n.t('settings:logger.toast.cleared') })
    }
  })
}
