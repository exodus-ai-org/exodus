import { useState } from 'react'
import { sileo } from 'sileo'

import {
  speechToText as speechToTextService,
  textToSpeech as textToSpeechService
} from '@/services/audio'

export function useAudio() {
  const [data, setData] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function textToSpeech(text: string) {
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
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('audio', file)
      const transcription = await speechToTextService(formData)
      setData(transcription.text)
    } catch (e) {
      sileo.error({
        title: 'Transcription failed',
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
