import { os } from '@orpc/server'
import { getAllChats } from '../../db/queries'

export const getAll = os.handler(async () => {
  return await getAllChats()
})
