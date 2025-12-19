import { os } from '@orpc/server'
import { getSetting } from '../../db/queries'

export const withSetting = os.middleware(async ({ context, next }) => {
  const setting = await getSetting()

  return next({
    context: {
      ...context,
      setting
    }
  })
})
