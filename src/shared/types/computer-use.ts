/** One installed application, as `GET /api/computer-use/apps` returns it. */
export interface InstalledApp {
  name: string
  bundleId: string
  path: string
  /** `data:image/png;base64,…` of the app icon (~40px), absent if it failed to render. */
  icon?: string
}
