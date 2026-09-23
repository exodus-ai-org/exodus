import { join } from 'path'

import { app, nativeImage } from 'electron'

/**
 * `bun run start` runs node_modules' prebuilt Electron.app, so the Dock would
 * show Electron's icon; the packaged app gets build/icon.icns from forge
 * instead. In dev, point the Dock at the active brand variant's
 * build/icon-dock.png (`bun run icons:use <variant>` switches it). The menu
 * bar title still reads "Electron" — it comes from that bundle's Info.plist
 * and cannot be changed at runtime.
 */
export function setDevDockIcon(): void {
  if (app.isPackaged || process.platform !== 'darwin') return
  // In dev, __dirname is <repo>/.vite/build (see getResourcePath).
  const image = nativeImage.createFromPath(
    join(__dirname, '../../build/icon-dock.png')
  )
  if (!image.isEmpty()) app.dock?.setIcon(image)
}
