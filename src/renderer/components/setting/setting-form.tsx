import { Form } from '@/components/ui/form'
import { useSetting } from '@/hooks/use-setting'
import { settingLabelAtom } from '@/stores/setting'
import { zodResolver } from '@hookform/resolvers/zod'
import { Setting, SettingSchema } from '@shared/schemas/setting-schema'
import { AiProviders } from '@shared/types/ai'
import { useAtomValue } from 'jotai'
import { useForm } from 'react-hook-form'
import { AudioSpeech } from './setting-form/audio-speech'
import { DataControls } from './setting-form/data-controls'
import { DeepResearch } from './setting-form/deep-research'
import { General } from './setting-form/generals'
import { GoogleMaps } from './setting-form/google-maps'
import { ImageGeneration } from './setting-form/image-generation'
// ARCHIVED: import { MCP } from './setting-form/mcp'
import { MemoryLayer } from './setting-form/memory-layer'
import { ProviderConfig } from './setting-form/provider-config'
import { AnthropicClaude } from './setting-form/providers/anthropic-claude'
import { AzureOpenAi } from './setting-form/providers/azure-openai'
import { GoogleGemini } from './setting-form/providers/google-gemini'
import { Ollama } from './setting-form/providers/ollama'
import { OpenAiGpt } from './setting-form/providers/openai-gpt'
import { XaiGrok } from './setting-form/providers/xai-grok'
import { Rag } from './setting-form/rag'
import { S3 } from './setting-form/s3'
import { SystemInfo } from './setting-form/system-info'
import { Tools } from './setting-form/tools'
import { WebSearch } from './setting-form/web-search'
import { UnderConstruction } from './under-construction'

export function SettingsForm() {
  // ARCHIVED: const setIsMcpServerChanged = useSetAtom(isMcpServerChangedAtom)
  const { data: setting, updateSetting } = useSetting()
  const activeTitle = useAtomValue(settingLabelAtom)

  const form = useForm({
    resolver: zodResolver(SettingSchema),
    values: setting,
    mode: 'onBlur'
  })

  function onSubmit(values: Setting) {
    if (!setting) return

    if (form.formState.isDirty) {
      // ARCHIVED: if (form.formState.dirtyFields.mcpServers) { setIsMcpServerChanged(true) }
      updateSetting({ ...values, id: setting.id })
    }
  }

  return (
    <Form {...form}>
      <form
        className="flex flex-1 flex-col gap-4"
        onBlur={form.handleSubmit(onSubmit)}
      >
        {activeTitle === 'General' && <General form={form} />}

        {activeTitle === 'AI Providers' && <ProviderConfig form={form} />}

        {activeTitle === AiProviders.OpenAiGpt && <OpenAiGpt form={form} />}

        {activeTitle === AiProviders.AzureOpenAi && <AzureOpenAi form={form} />}

        {activeTitle === AiProviders.AnthropicClaude && (
          <AnthropicClaude form={form} />
        )}

        {activeTitle === AiProviders.GoogleGemini && (
          <GoogleGemini form={form} />
        )}

        {activeTitle === AiProviders.XaiGrok && <XaiGrok form={form} />}

        {activeTitle === AiProviders.Ollama && <Ollama form={form} />}

        {activeTitle === 'Amazon S3' && <S3 form={form} />}

        {activeTitle === 'Audio and Speech' && <AudioSpeech form={form} />}

        {activeTitle === 'Image Generation' && <ImageGeneration form={form} />}

        {activeTitle === 'Google Maps' && <GoogleMaps form={form} />}

        {activeTitle === 'Web Search' && <WebSearch form={form} />}

        {activeTitle === 'Deep Research' && <DeepResearch form={form} />}

        {activeTitle === 'Memory Layer' && <MemoryLayer form={form} />}

        {/* ARCHIVED: {activeTitle === 'MCP Servers' && <MCP form={form} />} */}

        {activeTitle === 'Tools' && <Tools form={form} />}

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
