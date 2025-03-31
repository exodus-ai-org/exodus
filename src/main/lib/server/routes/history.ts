import { Router } from 'express'
import { getChats } from '../../db/queries'

const router = Router()

router.get('/', async function (req, res) {
  const chats = await getChats()
  res.json(chats)
})

export default router
