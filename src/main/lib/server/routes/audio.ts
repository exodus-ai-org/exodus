import { Hono } from 'hono'
import OpenAI, { toFile } from 'openai'
import { getSetting } from '../../db/queries'
import { Variables } from '../types'

const audio = new Hono<{ Variables: Variables }>()

audio.post('/speech', async (c) => {
  const { text } = await c.req.json()

  const setting = await getSetting()
  if (!('openaiApiKey' in setting)) {
    return c.text('OpenAI configuration is missing', 404)
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
  return new Response(buffer, {
    headers: {
      'Content-Type': 'audio/mpeg'
    }
  })
})

audio.post('/transcriptions', async (c) => {
  const formData = await c.req.formData()
  const audioFile = formData.get('audio') as File | null

  if (!audioFile) {
    return c.text('Audio file is missing', 404)
  }

  const setting = await getSetting()
  if (!('openaiApiKey' in setting)) {
    return c.text('OpenAI configuration is missing', 404)
  }

  const openai = new OpenAI({
    baseURL: setting.openaiBaseUrl,
    apiKey: setting.openaiApiKey
  })

  const arrayBuffer = await audioFile.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const file = await toFile(buffer)

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'gpt-4o-transcribe'
  })

  return c.json(transcription)
})

export default audio
