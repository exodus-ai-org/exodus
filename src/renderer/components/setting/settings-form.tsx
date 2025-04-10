import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useSetting } from '@/hooks/use-setting'
import { fetcher } from '@/lib/utils'
import { activeAtom } from '@/stores/setting'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAtomValue } from 'jotai'
import { debounce, isEqual } from 'lodash-es'
import { AlertCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import useSWR from 'swr'
import { z } from 'zod'
import { CodeEditor } from '../code-editor'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select'

const formSchema = z.object({
  openaiApiKey: z.string().min(1),
  openaiBaseUrl: z.string().url(),
  azureOpenaiApiKey: z.string().min(1),
  azureOpenAiEndpoint: z.string().url(),
  azureOpenAiApiVersion: z.string().url(),
  anthropicApiKey: z.string().min(1),
  anthropicBaseUrl: z.string().url(),
  googleApiKey: z.string().min(1),
  googleBaseUrl: z.string().url(),
  xAiApiKey: z.string().min(1),
  xAiBaseUrl: z.string().url(),
  ollamaBaseUrl: z.string().min(1),
  mcpServers: z.string().min(1),
  speechToTextModel: z.string().min(1),
  textToSpeechVoice: z.string().min(1),
  textToSpeechModel: z.string().min(1)
})

export function SettingsForm() {
  const activeTitle = useAtomValue(activeAtom)
  const { error } = useSWR(
    activeTitle === 'Ollama'
      ? '/api/ollama/ping?url=http://localhost:11434'
      : null,
    fetcher
  )
  const { data, mutate, updateSetting } = useSetting()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
    values: data
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
  }

  useEffect(() => {
    const subscription = form.watch(
      debounce((formValue) => {
        if (!isEqual(formValue, data)) {
          updateSetting(formValue)
          mutate()
          toast.success('Auto saved.')
        }
      }, 1000)
    )

    return () => subscription.unsubscribe()
  }, [data, form, form.watch, mutate, updateSetting])

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-1 flex-col gap-4"
      >
        {activeTitle === 'OpenAI GPT' && (
          <>
            <FormField
              control={form.control}
              name="openaiApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      id="openai-api-key-input"
                      autoComplete="current-password"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="openaiBaseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base URL</FormLabel>
                  <FormControl>
                    <Input type="text" id="openai-base-url-input" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        )}

        {activeTitle === 'Azure OpenAI' && (
          <>
            <FormField
              control={form.control}
              name="azureOpenaiApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      id="azure-openai-api-key-input"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="azureOpenAiEndpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      id="azure-openai-endpoint"
                      placeholder="https://{resourceName}.openai.azure.com/openai/deployments/{modelId}{path}"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="azureOpenAiApiVersion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Version</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      id="azure-openai-api-version"
                      placeholder="2024-12-01-preview"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        )}

        {activeTitle === 'Anthropic Claude' && (
          <>
            <FormField
              control={form.control}
              name="anthropicApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      id="anthropic-api-key-input"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="anthropicBaseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base URL</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      id="anthropic-base-url-input"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        )}

        {activeTitle === 'Google Gemini' && (
          <>
            <FormField
              control={form.control}
              name="googleApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      id="google-api-key-input"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="googleBaseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base URL</FormLabel>
                  <FormControl>
                    <Input type="text" id="google-base-url-input" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        )}

        {activeTitle === 'xAI Grok' && (
          <>
            <FormField
              control={form.control}
              name="xAiApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      id="xai-api-key-input"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="xAiBaseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base URL</FormLabel>
                  <FormControl>
                    <Input type="text" id="xai-base-url-input" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        )}

        {activeTitle === 'Ollama' && (
          <>
            <FormField
              control={form.control}
              name="ollamaBaseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base URL</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      id="ollama-base-url-input"
                      placeholder="http://localhost:11434"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormLabel>Status</FormLabel>

            {error === undefined ? (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-400" />
                <p className="text-sm">Ollama is running.</p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <p className="text-sm">Ollama is not running.</p>
              </div>
            )}
          </>
        )}

        {activeTitle === 'MCP Servers' && (
          <>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="block">
                We&apos;ve detected an update to your MCP servers&apos;
                configuration. To apply these changes, please click{' '}
                <span className="hover:text-primary cursor-pointer font-bold underline">
                  RESTART
                </span>{' '}
                to launch your servers now, or restart the application manually.
              </AlertDescription>
            </Alert>
            <CodeEditor
              props={{ control: form.control, name: 'mcpServers' }}
              className="-mx-4 !w-[calc(100%+2rem)]"
            />
          </>
        )}

        {activeTitle === 'Audio and Speech' && (
          <>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The Text-to-Speech and Speech-to-Text services only support
                OpenAI. Please make sure you have configured the OpenAI API
                settings correctly before using these features.
              </AlertDescription>
            </Alert>

            <FormField
              control={form.control}
              name="speechToTextModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Speech to Text Model</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="whisper-1" />
                      </SelectTrigger>
                    </FormControl>
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

            <FormField
              control={form.control}
              name="textToSpeechModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Text to Speech Model</FormLabel>

                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="tts-1" />
                      </SelectTrigger>
                    </FormControl>
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

            <FormField
              control={form.control}
              name="textToSpeechVoice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Text to Speech Voice</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Alloy" />
                      </SelectTrigger>
                    </FormControl>
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
          </>
        )}
      </form>
    </Form>
  )
}
