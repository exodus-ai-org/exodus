import { Alert, AlertDescription } from '@/components/ui/alert'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { AlertCircleIcon } from 'lucide-react'
import { Controller } from 'react-hook-form'

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

      <div className="flex flex-col gap-3">
        <Controller
          control={form.control}
          name="audio.speechToTextModel"
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <FieldLabel>Speech to Text Model</FieldLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <SelectTrigger className="hover:bg-accent w-fit border-none shadow-none">
                  <SelectValue placeholder="whisper-1" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="whisper-1">whisper-1</SelectItem>
                    <SelectItem value="gpt-4o-transcribe">
                      gpt-4o-transcribe
                    </SelectItem>
                    <SelectItem value="gpt-4o-mini-transcribe">
                      gpt-4o-mini-transcribe
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Separator />
        <Controller
          control={form.control}
          name="audio.textToSpeechModel"
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <FieldLabel>Text to Speech Model</FieldLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <SelectTrigger className="hover:bg-accent w-fit border-none shadow-none">
                  <SelectValue placeholder="tts-1" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="tts-1">tts-1</SelectItem>
                    <SelectItem value="tts-1-hd">tts-1-hd</SelectItem>
                    <SelectItem value="gpt-4o-mini-tts">
                      gpt-4o-mini-tts
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Separator />
        <Controller
          control={form.control}
          name="audio.textToSpeechVoice"
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <FieldLabel>Text to Speech Voice</FieldLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <SelectTrigger className="hover:bg-accent w-fit border-none shadow-none">
                  <SelectValue placeholder="Alloy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="alloy">Alloy</SelectItem>
                    <SelectItem value="ash">Ash</SelectItem>
                    <SelectItem value="ballad">Ballad</SelectItem>
                    <SelectItem value="coral">Coral</SelectItem>
                    <SelectItem value="echo">Echo</SelectItem>
                    <SelectItem value="fable">Fable</SelectItem>
                    <SelectItem value="onyx">Onyx</SelectItem>
                    <SelectItem value="nova">Nova</SelectItem>
                    <SelectItem value="sage">Sage</SelectItem>
                    <SelectItem value="shimmer">Shimmer</SelectItem>
                    <SelectItem key="verse" value="verse">
                      Verse
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>
    </>
  )
}
