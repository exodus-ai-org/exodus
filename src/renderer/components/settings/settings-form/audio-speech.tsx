import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { AlertCircleIcon } from 'lucide-react'
import { Controller } from 'react-hook-form'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import { SettingsRow, SettingsSection } from '../settings-row'
import { SettingsSelect } from '../settings-select'

const STT_MODELS = [
  { value: 'gpt-4o-transcribe', label: 'gpt-4o-transcribe' },
  { value: 'gpt-4o-mini-transcribe', label: 'gpt-4o-mini-transcribe' },
  {
    value: 'gpt-4o-transcribe-diarize',
    label: 'gpt-4o-transcribe-diarize'
  },
  { value: 'whisper-1', label: 'whisper-1' }
]

const TTS_MODELS = [
  { value: 'gpt-4o-mini-tts', label: 'gpt-4o-mini-tts' },
  { value: 'tts-1', label: 'tts-1' },
  { value: 'tts-1-hd', label: 'tts-1-hd' }
]

const TTS_VOICES = [
  'Alloy',
  'Ash',
  'Ballad',
  'Coral',
  'Echo',
  'Fable',
  'Onyx',
  'Nova',
  'Sage',
  'Shimmer',
  'Verse'
].map((v) => ({ value: v.toLowerCase(), label: v }))

const TTS_FORMATS = [
  { value: 'mp3', label: 'MP3' },
  { value: 'opus', label: 'Opus' },
  { value: 'aac', label: 'AAC' },
  { value: 'flac', label: 'FLAC' },
  { value: 'wav', label: 'WAV' },
  { value: 'pcm', label: 'PCM' }
]

export function AudioSpeech({ form }: { form: UseFormReturnType }) {
  const ttsModel = form.watch('audio.textToSpeechModel')

  return (
    <>
      <Alert className="mb-4">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription className="inline">
          The Text-to-Speech and Speech-to-Text services{' '}
          <strong>only support OpenAI</strong>. Please make sure you have
          configured the OpenAI API setting correctly before using these
          features.
        </AlertDescription>
      </Alert>

      <SettingsSection>
        <Controller
          control={form.control}
          name="audio.speechToTextModel"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="Speech to Text Model"
              description="Transcribes audio input into text"
              error={fieldState.error}
            >
              <SettingsSelect
                value={field.value ?? ''}
                onValueChange={field.onChange}
                options={STT_MODELS}
                placeholder="gpt-4o-mini-transcribe"
              />
            </SettingsRow>
          )}
        />
        <Controller
          control={form.control}
          name="audio.textToSpeechModel"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="Text to Speech Model"
              description="Generates spoken audio from text responses. gpt-4o-mini-tts supports tone/style instructions."
              error={fieldState.error}
            >
              <SettingsSelect
                value={field.value ?? ''}
                onValueChange={field.onChange}
                options={TTS_MODELS}
                placeholder="gpt-4o-mini-tts"
              />
            </SettingsRow>
          )}
        />
        <Controller
          control={form.control}
          name="audio.textToSpeechVoice"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="Text to Speech Voice"
              description="Voice persona for generated speech"
              error={fieldState.error}
            >
              <SettingsSelect
                value={field.value ?? ''}
                onValueChange={field.onChange}
                options={TTS_VOICES}
                placeholder="Alloy"
              />
            </SettingsRow>
          )}
        />
        <Controller
          control={form.control}
          name="audio.textToSpeechFormat"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="Output Format"
              description="Audio format for generated speech"
              error={fieldState.error}
            >
              <SettingsSelect
                value={field.value ?? ''}
                onValueChange={field.onChange}
                options={TTS_FORMATS}
                placeholder="MP3"
              />
            </SettingsRow>
          )}
        />
        <Controller
          control={form.control}
          name="audio.textToSpeechSpeed"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="Speed"
              description="Playback speed (0.25 – 4.0, default 1.0)"
              error={fieldState.error}
            >
              <Input
                type="number"
                step={0.25}
                min={0.25}
                max={4.0}
                {...field}
                value={field.value ?? ''}
                className="w-20"
              />
            </SettingsRow>
          )}
        />
        {ttsModel === 'gpt-4o-mini-tts' && (
          <Controller
            control={form.control}
            name="audio.textToSpeechInstructions"
            render={({ field, fieldState }) => (
              <SettingsRow
                label="Voice Instructions"
                description="Natural-language instructions to control tone, emotion and style (gpt-4o-mini-tts only)"
                error={fieldState.error}
              >
                <Textarea
                  {...field}
                  value={field.value ?? ''}
                  placeholder="e.g. Speak in a warm, friendly tone with a slight British accent"
                  className="min-h-16 resize-y"
                />
              </SettingsRow>
            )}
          />
        )}
      </SettingsSection>
    </>
  )
}
