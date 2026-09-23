// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const state = vi.hoisted(() => ({
  settings: undefined as { autoBackup?: boolean } | undefined,
  backupStatus: undefined as
    | { autoBackup: boolean; lastBackupAt: string | null }
    | undefined
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: ({ children }: { children?: unknown }) => children ?? null
}))
vi.mock('@/hooks/use-settings', () => ({
  useSettings: () => ({ data: state.settings, updateSettings: vi.fn() })
}))
vi.mock('@/hooks/use-backup', () => ({
  useBackupStatus: () => ({ data: state.backupStatus, isLoading: false }),
  useBackupList: () => ({ data: [], isLoading: false }),
  useCreateBackup: () => ({ isPending: false, mutate: vi.fn() })
}))
vi.mock('@/hooks/use-db-io', () => ({
  useDbIo: () => ({
    exportData: vi.fn(),
    importData: vi.fn(),
    deleteData: vi.fn(),
    exportLoading: false,
    importLoading: false,
    deleteLoading: false
  })
}))

const { DataControls } =
  await import('@/components/settings/settings-form/data-controls')

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>

const render = () => act(() => root.render(createElement(DataControls)))
const autoBackupSwitch = () =>
  host.querySelector('[role="switch"]')?.getAttribute('aria-checked')

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  state.settings = undefined
  state.backupStatus = undefined
})

describe('DataControls: the automatic-backup switch', () => {
  it('shows the saved setting, not a backup status that has not been re-read since', () => {
    state.settings = { autoBackup: false }
    state.backupStatus = { autoBackup: true, lastBackupAt: null }
    render()
    expect(autoBackupSwitch()).toBe('false')
  })

  it('turns on from the setting even when the stale status says off', () => {
    state.settings = { autoBackup: true }
    state.backupStatus = { autoBackup: false, lastBackupAt: null }
    render()
    expect(autoBackupSwitch()).toBe('true')
  })

  it('follows the setting when it changes while the status stays as it was', () => {
    state.settings = { autoBackup: true }
    state.backupStatus = { autoBackup: true, lastBackupAt: null }
    render()
    expect(autoBackupSwitch()).toBe('true')

    state.settings = { autoBackup: false }
    render()
    expect(autoBackupSwitch()).toBe('false')
  })

  it('defaults to on while nothing has loaded, as the server does', () => {
    render()
    expect(autoBackupSwitch()).toBe('true')
  })
})
