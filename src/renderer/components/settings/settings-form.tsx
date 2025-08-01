import { Form } from '@/components/ui/form'
import { useSettings } from '@/hooks/use-settings'
import { isMcpServerChangedAtom, settingsLabelAtom } from '@/stores/settings'
import { zodResolver } from '@hookform/resolvers/zod'
import { settingsSchema, SettingsType } from '@shared/schemas/settings-schema'
import { Providers } from '@shared/types/ai'
import { useAtomValue, useSetAtom } from 'jotai'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { AudioSpeech } from './settings-form/audio-speech'
import { DataControls } from './settings-form/data-controls'
import { DeepResearch } from './settings-form/deep-research'
import { FileUploadEndpoint } from './settings-form/file-upload-endpoint'
import { General } from './settings-form/generals'
import { GoogleMaps } from './settings-form/google-maps'
import { ImageGeneration } from './settings-form/image-generation'
import { MCP } from './settings-form/mcp'
import { ProviderConfig } from './settings-form/provider-config'
import { AnthropicClaude } from './settings-form/providers/anthropic-claude'
import { AzureOpenAi } from './settings-form/providers/azure-openai'
import { GoogleGemini } from './settings-form/providers/google-gemini'
import { Ollama } from './settings-form/providers/ollama'
import { OpenAiGpt } from './settings-form/providers/openai-gpt'
import { XaiGrok } from './settings-form/providers/xai-grok'
import { Rag } from './settings-form/rag'
import { SystemInfo } from './settings-form/system-info'
import { WebSearch } from './settings-form/web-search'
import { UnderConstruction } from './under-construction'

export function SettingsForm() {
  const setIsMcpServerChanged = useSetAtom(isMcpServerChangedAtom)
  const { data: settings, updateSetting } = useSettings()
  const activeTitle = useAtomValue(settingsLabelAtom)

  const form = useForm<SettingsType>({
    resolver: zodResolver(settingsSchema),
    values: settings,
    mode: 'onBlur'
  })

  function onSubmit(values: z.infer<typeof settingsSchema>) {
    if (!settings) return

    if (form.formState.isDirty) {
      if (form.formState.dirtyFields.mcpServers) {
        setIsMcpServerChanged(true)
      }

      // @ts-expect-error TODO: Need to fix.
      updateSetting({ id: settings.id, ...values })
    }
  }

  return (
    <Form {...form}>
      <form
        className="flex flex-1 flex-col gap-4"
        onBlur={form.handleSubmit(onSubmit)}
      >
        {activeTitle === 'General' && <General form={form} />}

        {activeTitle === 'Providers' && <ProviderConfig form={form} />}

        {activeTitle === Providers.OpenAiGpt && <OpenAiGpt form={form} />}

        {activeTitle === Providers.AzureOpenAi && <AzureOpenAi form={form} />}

        {activeTitle === Providers.AnthropicClaude && (
          <AnthropicClaude form={form} />
        )}

        {activeTitle === Providers.GoogleGemini && <GoogleGemini form={form} />}

        {activeTitle === Providers.XaiGrok && <XaiGrok form={form} />}

        {activeTitle === Providers.Ollama && <Ollama form={form} />}

        {activeTitle === 'File Upload Endpoint' && (
          <FileUploadEndpoint form={form} />
        )}

        {activeTitle === 'MCP Servers' && <MCP form={form} />}

        {activeTitle === 'Audio and Speech' && <AudioSpeech form={form} />}

        {activeTitle === 'Image Generation' && <ImageGeneration form={form} />}

        {activeTitle === 'Google Maps' && <GoogleMaps form={form} />}

        {activeTitle === 'Web Search' && <WebSearch form={form} />}

        {activeTitle === 'Deep Research' && <DeepResearch form={form} />}

        {activeTitle === 'RAG' && <Rag />}

        {activeTitle === 'Immersion' && <UnderConstruction />}

        {activeTitle === 'Computer Use' && <UnderConstruction />}

        {activeTitle === 'Browser Use' && <UnderConstruction />}

        {activeTitle === 'Data Controls' && <DataControls />}

        {activeTitle === 'About Exodus' && <SystemInfo />}
      </form>
    </Form>
  )
}
