import type { ColorTone } from '@shared/schemas/settings-schema'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { Moon, Sun, SunMoon } from 'lucide-react'
import { useEffect } from 'react'

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
import { useTone } from '@/hooks/use-tone'
import { useUpdater } from '@/hooks/use-updater'
import { updaterSetAutoDownload } from '@/lib/ipc'

import { SettingsRow, SettingsSection } from '../settings-row'
import { AvatarUploader } from './avatar-uploader'
import { UpdatePanel } from './update-panel'

const TONE_PRESETS: { value: ColorTone; label: string; color: string }[] = [
  { value: 'neutral', label: 'Neutral', color: 'oklch(0.52 0 0)' },
  { value: 'emerald', label: 'Emerald', color: 'oklch(0.52 0.17 160)' },
  { value: 'blue', label: 'Blue', color: 'oklch(0.52 0.17 230)' },
  { value: 'violet', label: 'Violet', color: 'oklch(0.52 0.17 285)' },
  { value: 'rose', label: 'Rose', color: 'oklch(0.52 0.17 350)' },
  { value: 'orange', label: 'Orange', color: 'oklch(0.52 0.17 55)' }
]

export function General({ form }: { form: UseFormReturnType }) {
  const { theme, setTheme } = useTheme()
  const { tone, setTone } = useTone()
  const { payload } = useUpdater()
  const autoUpdate = form.watch('autoUpdate') ?? true

  useEffect(() => {
    updaterSetAutoDownload(autoUpdate)
  }, [autoUpdate])

  return (
    <SettingsSection>
      <SettingsRow
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
      </SettingsRow>

      <SettingsRow
        label="Color Tone"
        description="Choose a color accent for the interface"
      >
        <div className="flex items-center gap-2">
          {TONE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              title={preset.label}
              className={`h-6 w-6 rounded-full transition-all ${
                tone === preset.value
                  ? 'ring-ring ring-offset-background ring-2 ring-offset-2'
                  : 'hover:scale-110'
              }`}
              style={{ backgroundColor: preset.color }}
              onClick={() => setTone(preset.value)}
            />
          ))}
        </div>
      </SettingsRow>

      <SettingsRow
        label="Run on startup"
        description="Automatically start Exodus when you log in"
      >
        <Switch />
      </SettingsRow>

      <SettingsRow label="Menu bar" description="Show Exodus in the menu bar">
        <Switch />
      </SettingsRow>

      <SettingsRow
        label="Assistant Avatar"
        description="Personalize your assistant with an avatar for a better user experience."
      >
        <AvatarUploader
          props={{ control: form.control, name: 'assistantAvatar' }}
        />
      </SettingsRow>

      <SettingsRow
        label="Auto Update"
        description="Automatically download and install updates when available"
      >
        <Switch
          checked={autoUpdate}
          onCheckedChange={(checked) => form.setValue('autoUpdate', checked)}
        />
      </SettingsRow>

      <UpdatePanel payload={payload} autoUpdate={autoUpdate} />
    </SettingsSection>
  )
}
