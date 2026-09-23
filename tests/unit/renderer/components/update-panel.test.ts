// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const ipc = vi.hoisted(() => ({
  updaterCheck: vi.fn(),
  updaterDownload: vi.fn(),
  updaterInstall: vi.fn()
}))
vi.mock('@/lib/ipc', () => ipc)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))

const { UpdatePanel } =
  await import('@/components/settings/settings-form/update-panel')

import type { UpdaterPayload } from '@/hooks/use-updater'

const available = (mode: UpdaterPayload['mode']): UpdaterPayload => ({
  state: 'available',
  availableVersion: 'v1.16.0',
  downloadProgress: 0,
  errorMessage: null,
  mode
})

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>

function render(payload: UpdaterPayload, autoUpdate: boolean) {
  act(() => root.render(createElement(UpdatePanel, { payload, autoUpdate })))
}

const buttons = () => [...host.querySelectorAll('button')]

beforeEach(() => {
  vi.clearAllMocks()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('UpdatePanel — a newer version is available', () => {
  it('a build that cannot update itself explains so and links to the download page', () => {
    render(available('manual'), true)

    expect(host.textContent).toContain('settings:about.update.manualHint')
    const [button] = buttons()
    expect(button.textContent).toContain('settings:about.update.downloadPage')

    act(() => button.click())
    expect(ipc.updaterDownload).toHaveBeenCalledTimes(1)
  })

  it('the button is there even with automatic updates on — the page is the only way', () => {
    render(available('manual'), true)
    expect(buttons()).toHaveLength(1)
  })

  it('a signed build with automatic updates on has nothing to click: it is already downloading', () => {
    render(available('auto'), true)

    expect(buttons()).toHaveLength(0)
    expect(host.textContent).not.toContain('manualHint')
  })

  it('a signed build with automatic updates off offers the plain download', () => {
    render(available('auto'), false)

    const [button] = buttons()
    expect(button.textContent).toContain('settings:about.update.download')
    expect(button.textContent).not.toContain('downloadPage')
  })
})
