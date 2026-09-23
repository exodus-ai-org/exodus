/**
 * A URL for display: every query-string value replaced with dots. A remote
 * server's URL often carries its API key as a parameter (`?apikey=…`), and a
 * list row is on screen in screenshots and screen shares — the full value
 * stays available in the edit form.
 */
export function maskUrlSecrets(url: string): string {
  return url.replace(/([?&][^=&#]+=)[^&#]*/gu, '$1••••')
}
