import { Router } from 'express'
import multer from 'multer'
import OpenAI, { toFile } from 'openai'
import { getSetting } from '../../db/queries'

const upload = multer({ dest: 'uploads/' })
const router = Router()

router.post('/speech', async function (req, res) {
  const { text } = req.body

  const setting = await getSetting()
  if (!('openaiApiKey' in setting)) {
    res.sendStatus(404).send('OpenAI configuration is missing')
    return
  }

  const openai = new OpenAI({
    baseURL: setting.openaiBaseUrl,
    apiKey: setting.openaiApiKey
  })
  const speech = await openai.audio.speech.create({
    model: 'tts-1',
    input: text,
    voice: 'alloy'
  })
  const buffer = Buffer.from(await speech.arrayBuffer())
  res.set('Content-Type', 'audio/mpeg')
  res.send(buffer)
})

router.post(
  '/transcriptions',
  upload.single('audio'),
  async function (req, res) {
    const audio = req.file

    if (!audio) {
      res.sendStatus(404).send('Audio file is missing')
      return
    }

    const setting = await getSetting()
    if (!('openaiApiKey' in setting)) {
      res.sendStatus(404).send('OpenAI configuration is missing')
      return
    }

    const openai = new OpenAI({
      baseURL: setting.openaiBaseUrl,
      apiKey: setting.openaiApiKey
    })

    const file = await toFile(audio.buffer)
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'gpt-4o-transcribe'
    })

    res.json(transcription)
  }
)

export default router
