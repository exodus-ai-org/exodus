// The skills.sh relay is a remote host, unlike the local API the app-wide
// `retry: 1` is tuned for: a blip has to heal itself (retries at +1, +2, +4 s,
// about 7 s in all) before the read is declared failed.
export const RELAY_RETRY = {
  retry: 3,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30_000)
} as const
