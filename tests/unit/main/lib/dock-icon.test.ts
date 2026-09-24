import { afterEach, describe, expect, it, vi } from 'vitest'

const setIcon = vi.fn()
const createFromPath = vi.fn()
const app = { isPackaged: false, dock: { setIcon } }
vi.mock('electron', () => ({ app, nativeImage: { createFromPath } }))

const { setDevDockIcon } = await import('@main/lib/dock-icon')

const image = (empty: boolean) => ({ isEmpty: () => empty })
const platform = process.platform
const setPlatform = (value: string) =>
  Object.defineProperty(process, 'platform', { value })

afterEach(() => {
  vi.clearAllMocks()
  app.isPackaged = false
  setPlatform(platform)
})

describe('setDevDockIcon', () => {
  it('points the Dock at build/icon-dock.png in a dev run on macOS', () => {
    setPlatform('darwin')
    const img = image(false)
    createFromPath.mockReturnValue(img)
    setDevDockIcon()
    expect(createFromPath.mock.calls[0][0]).toMatch(
      /build[/\\]icon-dock\.png$/u
    )
    expect(setIcon).toHaveBeenCalledWith(img)
  })

  it('leaves a packaged app alone: forge already gave it build/icon.icns', () => {
    setPlatform('darwin')
    app.isPackaged = true
    setDevDockIcon()
    expect(createFromPath).not.toHaveBeenCalled()
  })

  it('does nothing off macOS', () => {
    setPlatform('win32')
    setDevDockIcon()
    expect(createFromPath).not.toHaveBeenCalled()
  })

  it('keeps the default icon when the PNG has not been generated', () => {
    setPlatform('darwin')
    createFromPath.mockReturnValue(image(true))
    setDevDockIcon()
    expect(setIcon).not.toHaveBeenCalled()
  })
})
