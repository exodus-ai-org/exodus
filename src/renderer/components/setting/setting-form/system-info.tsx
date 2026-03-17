import { version } from '../../../../../package.json'
import { SettingRow, SettingSection } from '../setting-row'

export function SystemInfo() {
  const { versions } = window.electron.process
  const { os } = window.api

  return (
    <SettingSection>
      <SettingRow label="Version">
        <span className="text-ring text-sm">v{version}</span>
      </SettingRow>
      <SettingRow label="Electron">
        <span className="text-ring text-sm">v{versions.electron}</span>
      </SettingRow>
      <SettingRow label="Chromium">
        <span className="text-ring text-sm">v{versions.chrome}</span>
      </SettingRow>
      <SettingRow label="Node.js">
        <span className="text-ring text-sm">v{versions.node}</span>
      </SettingRow>
      <SettingRow label="V8">
        <span className="text-ring text-sm">v{versions.v8}</span>
      </SettingRow>
      <SettingRow label="OS">
        <span className="text-ring text-sm">{os}</span>
      </SettingRow>
    </SettingSection>
  )
}
