import { Alert, AlertDescription } from '@/components/ui/alert'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { AlertCircleIcon } from 'lucide-react'
import { Controller } from 'react-hook-form'
import { SettingRow, SettingSection } from '../setting-row'
import { SettingSelect } from '../setting-select'

const STT_MODELS = [
  { value: 'whisper-1', label: 'whisper-1' },
  { value: 'gpt-4o-transcribe', label: 'gpt-4o-transcribe' },
  { value: 'gpt-4o-mini-transcribe', label: 'gpt-4o-mini-transcribe' }
]

const TTS_MODELS = [
  { value: 'tts-1', label: 'tts-1' },
  { value: 'tts-1-hd', label: 'tts-1-hd' },
  { value: 'gpt-4o-mini-tts', label: 'gpt-4o-mini-tts' }
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

export function AudioSpeech({ form }: { form: UseFormReturnType }) {
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

      <SettingSection>
        <Controller
          control={form.control}
          name="audio.speechToTextModel"
          render={({ field, fieldState }) => (
            <SettingRow
              label="Speech to Text Model"
              description="Transcribes audio input into text"
              error={fieldState.error}
            >
              <SettingSelect
                value={field.value ?? ''}
                onValueChange={field.onChange}
                options={STT_MODELS}
                placeholder="whisper-1"
              />
            </SettingRow>
          )}
        />
        <Controller
          control={form.control}
          name="audio.textToSpeechModel"
          render={({ field, fieldState }) => (
            <SettingRow
              label="Text to Speech Model"
              description="Generates spoken audio from text responses"
              error={fieldState.error}
            >
              <SettingSelect
                value={field.value ?? ''}
                onValueChange={field.onChange}
                options={TTS_MODELS}
                placeholder="tts-1"
              />
            </SettingRow>
          )}
        />
        <Controller
          control={form.control}
          name="audio.textToSpeechVoice"
          render={({ field, fieldState }) => (
            <SettingRow
              label="Text to Speech Voice"
              description="Voice persona for generated speech"
              error={fieldState.error}
            >
              <SettingSelect
                value={field.value ?? ''}
                onValueChange={field.onChange}
                options={TTS_VOICES}
                placeholder="Alloy"
              />
            </SettingRow>
          )}
        />
      </SettingSection>
    </>
  )
}
