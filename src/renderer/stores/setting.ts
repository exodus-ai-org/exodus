import { SettingLabel, SettingPage } from '@/components/setting/setting-menu'
import { atom } from 'jotai'

export const settingLabelAtom = atom<SettingPage>(SettingLabel.General)
