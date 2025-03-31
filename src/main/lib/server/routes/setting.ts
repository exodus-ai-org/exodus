import { Router } from 'express'
import { getSetting, updateSetting } from '../../db/queries'

const router = Router()

router.get('/', async function (req, res) {
  const setting = await getSetting()
  res.json(setting)
})

router.post('/', async function (req, res) {
  const payload = req.body
  const setting = await updateSetting(payload)
  res.json(setting)
})

export default router
