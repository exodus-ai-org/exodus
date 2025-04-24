import { BASE_URL } from '@shared/constants'
import OpenAI from 'openai'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useSettings } from './use-settings'

export function useAudio() {
  const [data, setData] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { data: settings } = useSettings()

  const openai = useMemo(() => {
    if (
      settings?.providers?.openaiApiKey &&
      settings?.providers?.openaiBaseUrl
    ) {
      return new OpenAI({
        baseURL: settings.providers.openaiBaseUrl,
        apiKey: settings.providers.openaiApiKey,
        dangerouslyAllowBrowser: true
      })
    }
    return null
  }, [settings?.providers?.openaiApiKey, settings?.providers?.openaiBaseUrl])

  async function textToSpeech(text: string) {
    if (!openai) {
      throw new Error('OpenAI configuration is missing')
    }

    setLoading(true)
    try {
      const response = await fetch(`${BASE_URL}/api/audio/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      })
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      setData(audioUrl)
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'An error occurred, please try again!'
      )
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
      const response = await fetch(`${BASE_URL}/api/audio/transcriptions`, {
        method: 'POST',
        body: formData
      })
      const transcription = await response.json()
      setData(transcription.text as string)
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'An error occurred, please try again!'
      )
    } finally {
      setLoading(false)
    }
  }

  return { loading, data, textToSpeech, speechToText }
}
