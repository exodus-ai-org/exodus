import { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import OpenAI from 'openai'
import { getSettings } from '../../db/queries'

const audio = new Hono<{ Variables: Variables }>()

audio.post('/speech', async (c) => {
  const { text } = await c.req.json()

  const settings = await getSettings()
  if (!('id' in settings)) {
    return c.text('OpenAI configuration is missing', 404)
  }

  const openai = new OpenAI({
    baseURL: settings.providers?.openaiBaseUrl,
    apiKey: settings.providers?.openaiApiKey ?? ''
  })

  const speech = await openai.audio.speech.create({
    model: settings.audio?.textToSpeechModel ?? 'tts-1',
    input: text,
    voice: settings.audio?.textToSpeechVoice ?? 'alloy'
  })

  const buffer = Buffer.from(await speech.arrayBuffer())
  return new Response(buffer, {
    headers: {
      'Content-Type': 'audio/mpeg'
    }
  })
})

audio.post('/transcriptions', async (c) => {
  const body = await c.req.parseBody()
  const audioFile = body['audio']

  if (typeof audioFile === 'string') {
    return c.text('Audio file is missing', 404)
  }

  const settings = await getSettings()
  if (!('providerConfig' in settings)) {
    return c.text('OpenAI configuration is missing', 404)
  }

  const openai = new OpenAI({
    baseURL: settings.providers?.openaiBaseUrl,
    apiKey: settings.providers?.openaiApiKey ?? ''
  })

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: settings.audio?.speechToTextModel ?? 'whisper-1'
  })

  return c.json(transcription)
})

export default audio
