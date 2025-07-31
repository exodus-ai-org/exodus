import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { AlertCircle } from 'lucide-react'

export function AudioSpeech({ form }: { form: UseFormReturnType }) {
  return (
    <>
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="inline">
          The Text-to-Speech and Speech-to-Text services{' '}
          <strong>only support OpenAI</strong>. Please make sure you have
          configured the OpenAI API settings correctly before using these
          features.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3">
        <FormField
          control={form.control}
          name="audio.speechToTextModel"
          render={({ field }) => (
            <FormItem className="flex justify-between">
              <FormLabel className="mb-0">Speech to Text Model</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl className="mb-0 w-fit">
                  <SelectTrigger className="hover:bg-accent border-none shadow-none">
                    <SelectValue placeholder="whisper-1" />
                  </SelectTrigger>
                </FormControl>
                <FormMessage />
                <SelectContent>
                  <SelectItem value="whisper-1">whisper-1</SelectItem>
                  <SelectItem value="gpt-4o-transcribe">
                    gpt-4o-transcribe
                  </SelectItem>
                  <SelectItem value="gpt-4o-mini-transcribe">
                    gpt-4o-mini-transcribe
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <Separator />
        <FormField
          control={form.control}
          name="audio.textToSpeechModel"
          render={({ field }) => (
            <FormItem className="flex justify-between">
              <FormLabel className="mb-0">Text to Speech Model</FormLabel>

              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl className="mb-0 w-fit">
                  <SelectTrigger className="hover:bg-accent border-none shadow-none">
                    <SelectValue placeholder="tts-1" />
                  </SelectTrigger>
                </FormControl>
                <FormMessage />
                <SelectContent>
                  <SelectItem value="tts-1">tts-1</SelectItem>
                  <SelectItem value="tts-1-hd">tts-1-hd</SelectItem>
                  <SelectItem value="gpt-4o-mini-tts">
                    gpt-4o-mini-tts
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <Separator />
        <FormField
          control={form.control}
          name="audio.textToSpeechVoice"
          render={({ field }) => (
            <FormItem className="flex justify-between">
              <FormLabel className="mb-0">Text to Speech Voice</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl className="mb-0 w-fit">
                  <SelectTrigger className="hover:bg-accent border-none shadow-none">
                    <SelectValue placeholder="Alloy" />
                  </SelectTrigger>
                </FormControl>
                <FormMessage />
                <SelectContent>
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
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      </div>
    </>
  )
}
