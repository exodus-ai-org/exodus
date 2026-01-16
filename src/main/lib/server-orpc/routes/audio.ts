import { os } from '@orpc/server'
import { ErrorCode } from '@shared/constants/error-codes'
import { ConfigurationError } from '@shared/errors'
import OpenAI from 'openai'
import z from 'zod'
import { withSetting } from '../middlewares/with-setting'

export const speech = os
  .use(withSetting)
  .input(
    z.object({
      text: z.string()
    })
  )
  .handler(async ({ input, context }) => {
    const { setting } = context

    if (!setting.providers?.openaiApiKey) {
      throw new ConfigurationError(ErrorCode.CONFIG_MISSING_OPENAI)
    }

    const openai = new OpenAI({
      baseURL: setting.providers.openaiBaseUrl,
      apiKey: setting.providers.openaiApiKey
    })

    const speechResponse = await openai.audio.speech.create({
      model: setting.audio?.textToSpeechModel ?? 'tts-1',
      input: input.text,
      voice: setting.audio?.textToSpeechVoice ?? 'alloy'
    })

    const buffer = Buffer.from(await speechResponse.arrayBuffer())
    return buffer
  })

export const transcriptions = os
  .use(withSetting)
  .input(z.instanceof(File))
  .handler(async ({ input, context }) => {
    const { setting } = context

    if (!setting.providerConfig) {
      throw new ConfigurationError(ErrorCode.CONFIG_MISSING_OPENAI)
    }

    const openai = new OpenAI({
      baseURL: setting.providers?.openaiBaseUrl,
      apiKey: setting.providers?.openaiApiKey ?? ''
    })

    const transcription = await openai.audio.transcriptions.create({
      file: input,
      model: setting.audio?.speechToTextModel ?? 'whisper-1'
    })

    return transcription
  })
