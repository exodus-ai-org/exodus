import { atom } from 'jotai'

import { SettingLabel, SettingPage } from '@/components/setting/setting-menu'

export const settingLabelAtom = atom<SettingPage>(SettingLabel.General)
