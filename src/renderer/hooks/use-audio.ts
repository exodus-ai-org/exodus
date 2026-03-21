import OpenAI from 'openai'
import { useMemo, useState } from 'react'
import { sileo } from 'sileo'

import {
  speechToText as speechToTextService,
  textToSpeech as textToSpeechService
} from '@/services/audio'

import { useSetting } from './use-setting'

export function useAudio() {
  const [data, setData] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { data: setting } = useSetting()

  const openai = useMemo(() => {
    if (setting?.providers?.openaiApiKey && setting?.providers?.openaiBaseUrl) {
      return new OpenAI({
        baseURL: setting.providers.openaiBaseUrl,
        apiKey: setting.providers.openaiApiKey,
        dangerouslyAllowBrowser: true
      })
    }
    return null
  }, [setting?.providers?.openaiApiKey, setting?.providers?.openaiBaseUrl])

  async function textToSpeech(text: string) {
    if (!openai) {
      throw new Error('OpenAI configuration is missing')
    }

    setLoading(true)
    try {
      const audioBlob = await textToSpeechService(text)
      const audioUrl = URL.createObjectURL(audioBlob)
      setData(audioUrl)
    } catch (e) {
      sileo.error({
        title: 'Audio error',
        description:
          e instanceof Error
            ? e.message
            : 'An error occurred, please try again!'
      })
    } finally {
      setLoading(false)
    }
  }

  async function speechToText(file: File) {
    if (!openai) {
      throw new Error('OpenAI configuration is missing')
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('audio', file)
      const transcription = await speechToTextService(formData)
      setData(transcription.text)
    } catch (e) {
      sileo.error({
        title: 'Audio error',
        description:
          e instanceof Error
            ? e.message
            : 'An error occurred, please try again!'
      })
    } finally {
      setLoading(false)
    }
  }

  return { loading, data, textToSpeech, speechToText }
}
