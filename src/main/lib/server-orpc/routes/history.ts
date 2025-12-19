import { os } from '@orpc/server'
import { getAllChats } from '../../db/queries'

export const findRelevant = os.handler(async () => {
  return await getAllChats()
})
