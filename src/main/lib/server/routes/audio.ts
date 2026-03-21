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

    const model = setting.audio?.textToSpeechModel ?? 'gpt-4o-mini-tts'
    const format = setting.audio?.textToSpeechFormat ?? 'mp3'
    const params: OpenAI.Audio.SpeechCreateParams = {
      model,
      input: text,
      voice: setting.audio?.textToSpeechVoice ?? 'alloy',
      response_format:
        format as OpenAI.Audio.SpeechCreateParams['response_format'],
      speed: setting.audio?.textToSpeechSpeed ?? undefined
    }
    // instructions is only supported by gpt-4o-mini-tts
    if (
      model === 'gpt-4o-mini-tts' &&
      setting.audio?.textToSpeechInstructions
    ) {
      params.instructions = setting.audio.textToSpeechInstructions
    }
    const speech = await openai.audio.speech.create(params)

    const contentTypeMap: Record<string, string> = {
      mp3: 'audio/mpeg',
      opus: 'audio/opus',
      aac: 'audio/aac',
      flac: 'audio/flac',
      wav: 'audio/wav',
      pcm: 'audio/pcm'
    }
    const buffer = Buffer.from(await speech.arrayBuffer())
    return new Response(buffer, {
      headers: {
        'Content-Type': contentTypeMap[format] ?? 'audio/mpeg'
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
      model: setting.audio?.speechToTextModel ?? 'gpt-4o-mini-transcribe'
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
