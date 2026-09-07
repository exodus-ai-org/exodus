import { TEST_IDS } from '@shared/constants/test-ids'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { Moon, Sun, SunMoon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect } from 'react'

import { Theme } from '@/components/theme-provider'
import { Switch } from '@/components/ui/switch'
import { setLoginItem, setMenuBar } from '@/lib/ipc'

import { SettingsRow, SettingsSection } from '../settings-row'
import { AvatarUploader } from './avatar-uploader'
import { LockPrivacy } from './lock-privacy'

const APPEARANCE_MODES: {
  value: Theme
  label: string
  icon: typeof Sun
}[] = [
  { value: 'system', label: 'System', icon: SunMoon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon }
]

function AppearanceSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="bg-muted inline-flex w-fit gap-0.5 rounded-full p-0.5">
      {APPEARANCE_MODES.map(({ value, label, icon: Icon }) => (
        <span key={value}>
          <input
            className="peer sr-only"
            type="radio"
            id={`appearance-mode-${value}`}
            name="appearance-mode"
            value={value}
            checked={theme === value}
            onChange={(event) => setTheme(event.target.value)}
          />
          <label
            htmlFor={`appearance-mode-${value}`}
            data-testid={`${TEST_IDS.settings.themeMode}-${value}`}
            aria-label={label}
            className="text-muted-foreground peer-checked:bg-background peer-checked:text-foreground flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors peer-checked:shadow-sm"
          >
            <Icon className="size-4" />
          </label>
        </span>
      ))}
    </div>
  )
}

export function General({ form }: { form: UseFormReturnType }) {
  const runOnStartup = form.watch('runOnStartup') ?? false
  const menuBarEnabled = form.watch('menuBar') ?? true

  useEffect(() => {
    setLoginItem(runOnStartup)
  }, [runOnStartup])

  useEffect(() => {
    setMenuBar(menuBarEnabled)
  }, [menuBarEnabled])

  return (
    <>
      <SettingsSection>
        <SettingsRow
          label="Theme"
          description="Choose light, dark, or match your system preference"
        >
          <AppearanceSwitcher />
        </SettingsRow>

        <SettingsRow
          label="Run on startup"
          description="Automatically start Exodus when you log in"
        >
          <Switch
            checked={runOnStartup}
            onCheckedChange={(checked) =>
              form.setValue('runOnStartup', checked)
            }
          />
        </SettingsRow>

        <SettingsRow label="Menu bar" description="Show Exodus in the menu bar">
          <Switch
            checked={menuBarEnabled}
            onCheckedChange={(checked) => form.setValue('menuBar', checked)}
          />
        </SettingsRow>

        <SettingsRow
          label="Assistant Avatar"
          description="Personalize your assistant with an avatar for a better user experience."
        >
          <AvatarUploader
            props={{ control: form.control, name: 'assistantAvatar' }}
          />
        </SettingsRow>
      </SettingsSection>

      <LockPrivacy />
    </>
  )
}
