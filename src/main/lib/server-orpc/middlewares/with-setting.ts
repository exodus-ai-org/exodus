import { os } from '@orpc/server'
import { getSettings } from '../../db/queries'
import { Setting } from '../../db/schema'

export const withSetting = os
  .$context<{ setting?: Setting }>()
  .middleware(async ({ context, next }) => {
    const setting = await getSettings()
    const result = await next({
      context: {
        ...context,
        setting
      }
    })

    return result
  })
