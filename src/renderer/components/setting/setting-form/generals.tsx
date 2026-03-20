import { Theme, useTheme } from '@/components/theme-provider'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useUpdater } from '@/hooks/use-updater'
import { updaterSetAutoDownload } from '@/lib/ipc'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { Moon, Sun, SunMoon } from 'lucide-react'
import { useEffect } from 'react'
import { SettingRow, SettingSection } from '../setting-row'
import { AvatarUploader } from './avatar-uploader'
import { UpdatePanel } from './update-panel'

export function General({ form }: { form: UseFormReturnType }) {
  const { theme, setTheme } = useTheme()
  const { payload } = useUpdater()
  const autoUpdate = form.watch('autoUpdate') ?? true

  useEffect(() => {
    updaterSetAutoDownload(autoUpdate)
  }, [autoUpdate])

  return (
    <SettingSection>
      <SettingRow
        label="Theme"
        description="Choose light, dark, or match your system preference"
      >
        <Select
          value={theme}
          onValueChange={(value) => value && setTheme(value as Theme)}
        >
          <SelectTrigger className="hover:bg-accent w-fit border-none shadow-none">
            <SelectValue placeholder="Select theme">
              {(val: string) =>
                ({ light: 'Light', dark: 'Dark', system: 'System' })[val] ?? val
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="no-drag w-full">
            <SelectGroup>
              <SelectItem value="light">
                <Sun /> Light
              </SelectItem>
              <SelectItem value="dark">
                <Moon /> Dark
              </SelectItem>
              <SelectItem value="system">
                <SunMoon /> System
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Run on startup"
        description="Automatically start Exodus when you log in"
      >
        <Switch />
      </SettingRow>

      <SettingRow label="Menu bar" description="Show Exodus in the menu bar">
        <Switch />
      </SettingRow>

      <SettingRow
        label="Assistant Avatar"
        description="Personalize your assistant with an avatar for a better user experience."
      >
        <AvatarUploader
          props={{ control: form.control, name: 'assistantAvatar' }}
        />
      </SettingRow>

      <SettingRow
        label="Auto Update"
        description="Automatically download and install updates when available"
      >
        <Switch
          checked={autoUpdate}
          onCheckedChange={(checked) => form.setValue('autoUpdate', checked)}
        />
      </SettingRow>

      <UpdatePanel payload={payload} autoUpdate={autoUpdate} />
    </SettingSection>
  )
}
