import { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import OpenAI from 'openai'
import { ChatSDKError } from '../errors'
import { speechSchema } from '../schemas/audio'
import { successResponse, validateOpenAIConfig, validateSchema } from '../utils'

const audio = new Hono<{ Variables: Variables }>()

audio.post('/speech', async (c) => {
  const { text } = validateSchema<{ text: string }>(
    speechSchema,
    await c.req.json(),
    'audio',
    'Invalid request body'
  )

  const setting = c.get('setting')
  const openaiConfig = validateOpenAIConfig(setting)

  try {
    const openai = new OpenAI(openaiConfig)

    const speech = await openai.audio.speech.create({
      model: setting.audio?.textToSpeechModel ?? 'tts-1',
      input: text,
      voice: setting.audio?.textToSpeechVoice ?? 'alloy'
    })

    const buffer = Buffer.from(await speech.arrayBuffer())
    return new Response(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg'
      }
    })
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:audio',
      error instanceof Error ? error.message : 'Failed to generate speech'
    )
  }
})

audio.post('/transcriptions', async (c) => {
  const body = await c.req.parseBody()
  const audioFile = body['audio']

  if (typeof audioFile === 'string') {
    throw new ChatSDKError('not_found:audio', 'Audio file is missing')
  }

  const setting = c.get('setting')
  const openaiConfig = validateOpenAIConfig(setting)

  try {
    const openai = new OpenAI(openaiConfig)

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: setting.audio?.speechToTextModel ?? 'whisper-1'
    })

    return successResponse(c, transcription)
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:audio',
      error instanceof Error ? error.message : 'Failed to transcribe audio'
    )
  }
})

export default audio
