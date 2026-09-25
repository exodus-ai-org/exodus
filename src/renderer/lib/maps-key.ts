/**
 * The Google Maps JS key for the map-itinerary card's `<APIProvider>`, asked
 * of the main process over IPC (`maps:js-key`, `src/main/lib/ipc.ts`), which
 * answers only this app's main window top frame. It is the one registry
 * secret the renderer itself needs, so it never travels over the API — any
 * loopback caller could read it there — and `GET /api/v1/settings` masks it.
 * Places photos do not need it here at all (`GET /api/v1/maps/photo`).
 */
const MAPS_KEY_CHANNEL = 'maps:js-key'

/** The key, or null when none is set or this window may not have it. */
export async function fetchMapsJsKey(): Promise<string | null> {
  try {
    const value = (await window.electron?.ipcRenderer.invoke(
      MAPS_KEY_CHANNEL
    )) as unknown
    return typeof value === 'string' && value ? value : null
  } catch {
    return null
  }
}
