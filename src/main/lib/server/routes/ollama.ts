import { Router } from 'express'

const router = Router()

router.get('/ping', async function (req, res) {
  const { url } = req.query
  if (typeof url !== 'string' || !url) {
    res.sendStatus(404)
    return
  }

  try {
    await fetch(url)
    res.json({
      message: 'Ollama is running'
    })
  } catch {
    res.sendStatus(404)
  }
})

export default router
