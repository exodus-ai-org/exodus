import { BASE_URL } from '@/lib/constants'
import OpenAI from 'openai'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useSetting } from './use-setting'

export function useAudio() {
  const [data, setData] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { data: setting } = useSetting()

  const openai = useMemo(() => {
    if (setting?.openaiApiKey && setting?.openaiBaseUrl) {
      return new OpenAI({
        baseURL: setting.openaiBaseUrl,
        apiKey: setting.openaiApiKey,
        dangerouslyAllowBrowser: true
      })
    }
    return null
  }, [setting?.openaiApiKey, setting?.openaiBaseUrl])

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
      toast.error(e instanceof Error ? e.message : 'Unknown error')
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
      toast.error(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return { loading, data, textToSpeech, speechToText }
}
