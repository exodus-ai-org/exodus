import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import type { ParseKeys } from 'i18next'
import { Moon, Sun, SunMoon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'

import { Theme } from '@/components/theme-provider'

const THEME_MODES: {
  value: Theme
  labelKey: ParseKeys<'settings'>
  icon: typeof Sun
}[] = [
  { value: 'system', labelKey: 'general.theme.system', icon: SunMoon },
  { value: 'light', labelKey: 'general.theme.light', icon: Sun },
  { value: 'dark', labelKey: 'general.theme.dark', icon: Moon }
]

/**
 * System / Light / Dark pill. The mode lives in next-themes' localStorage
 * (`vite-ui-theme`), not in settings — sub-apps read that key directly.
 */
export function ThemeModeSwitcher() {
  const { t } = useTranslation('settings')
  const { theme, setTheme } = useTheme()

  return (
    <div className="bg-muted inline-flex w-fit gap-0.5 rounded-full p-0.5">
      {THEME_MODES.map(({ value, labelKey, icon: Icon }) => (
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
            aria-label={t(labelKey)}
            className="text-muted-foreground peer-checked:bg-background peer-checked:text-foreground flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors peer-checked:shadow-sm"
          >
            <Icon className="size-4" />
          </label>
        </span>
      ))}
    </div>
  )
}
