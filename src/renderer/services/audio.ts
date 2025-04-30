import { Transcription } from 'openai/resources/audio/transcriptions'
import { fetcher } from './http'

export const textToSpeech = async (text: string) =>
  fetcher<Blob>('/api/audio/speech', {
    method: 'POST',
    body: { text },
    responseType: 'blob'
  })

export const speechToText = async (formData: FormData) =>
  fetcher<Transcription>('/api/audio/transcriptions', {
    method: 'POST',
    body: formData
  })
