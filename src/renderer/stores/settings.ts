import { atom } from 'jotai'

import {
  SettingsLabel,
  SettingsPage
} from '@/components/settings/settings-menu'

export const settingsLabelAtom = atom<SettingsPage>(SettingsLabel.General)
