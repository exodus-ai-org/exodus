import { os } from '@orpc/server'
import { SettingSchema } from '@shared/schemas/setting-schema'
import { getSettings, updateSetting } from '../../db/queries'

export const get = os.handler(async () => {
  return await getSettings()
})

export const update = os.input(SettingSchema).handler(async ({ input }) => {
  return await updateSetting(input)
})
