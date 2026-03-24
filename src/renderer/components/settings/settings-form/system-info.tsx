import { version } from '../../../../../package.json'
import { SettingsRow, SettingsSection } from '../settings-row'

export function SystemInfo() {
  const { versions } = window.electron.process
  const { os } = window.api

  return (
    <SettingsSection>
      <SettingsRow label="Version">
        <span className="text-ring text-sm">v{version}</span>
      </SettingsRow>
      <SettingsRow label="Electron">
        <span className="text-ring text-sm">v{versions.electron}</span>
      </SettingsRow>
      <SettingsRow label="Chromium">
        <span className="text-ring text-sm">v{versions.chrome}</span>
      </SettingsRow>
      <SettingsRow label="Node.js">
        <span className="text-ring text-sm">v{versions.node}</span>
      </SettingsRow>
      <SettingsRow label="V8">
        <span className="text-ring text-sm">v{versions.v8}</span>
      </SettingsRow>
      <SettingsRow label="OS">
        <span className="text-ring text-sm">{os}</span>
      </SettingsRow>
    </SettingsSection>
  )
}
