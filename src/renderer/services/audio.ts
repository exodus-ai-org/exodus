import { fetcher } from '@shared/utils/http'
import { Transcription } from 'openai/resources/audio/transcriptions'

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
