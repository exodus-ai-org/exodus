import { zodResolver } from '@hookform/resolvers/zod'
import { Setting, SettingSchema } from '@shared/schemas/settings-schema'
import { AiProviders } from '@shared/types/ai'
import { useAtomValue } from 'jotai'
import { useForm } from 'react-hook-form'

import { useSetting } from '@/hooks/use-setting'
import { settingLabelAtom } from '@/stores/setting'

import { AudioSpeech } from './setting-form/audio-speech'
import { DataControls } from './setting-form/data-controls'
import { DeepResearch } from './setting-form/deep-research'
import { General } from './setting-form/generals'
import { GoogleMaps } from './setting-form/google-maps'
import { GraphRAG } from './setting-form/graph-rag'
import { ImageGeneration } from './setting-form/image-generation'
import { McpServers } from './setting-form/mcp-servers'
import { MemoryLayer } from './setting-form/memory-layer'
import { ProviderConfig } from './setting-form/provider-config'
import { AnthropicClaude } from './setting-form/providers/anthropic-claude'
import { AzureOpenAi } from './setting-form/providers/azure-openai'
import { GoogleGemini } from './setting-form/providers/google-gemini'
import { Ollama } from './setting-form/providers/ollama'
import { OpenAiGpt } from './setting-form/providers/openai-gpt'
import { XaiGrok } from './setting-form/providers/xai-grok'
import { S3 } from './setting-form/s3'
import { SkillsMarketSetting } from './setting-form/skills-market'
import { SystemInfo } from './setting-form/system-info'
import { Tools } from './setting-form/tools'
import { WebSearch } from './setting-form/web-search'
import { SettingLabel } from './setting-menu'
import { UnderConstruction } from './under-construction'

export function SettingsForm() {
  const { data: setting, updateSetting } = useSetting()
  const activeTitle = useAtomValue(settingLabelAtom)

  const form = useForm({
    resolver: zodResolver(SettingSchema),
    values: setting,
    resetOptions: { keepDirtyValues: true },
    mode: 'onBlur'
  })

  function onSubmit(values: Setting) {
    if (!setting) return
    updateSetting({ ...values, id: setting.id })
  }

  return (
    <form
      className="flex flex-1 flex-col gap-4"
      onBlur={form.handleSubmit(onSubmit)}
    >
      {activeTitle === SettingLabel.General && <General form={form} />}

      {activeTitle === SettingLabel.AiProviders && (
        <ProviderConfig form={form} />
      )}

      {activeTitle === AiProviders.OpenAiGpt && <OpenAiGpt form={form} />}

      {activeTitle === AiProviders.AzureOpenAi && <AzureOpenAi form={form} />}

      {activeTitle === AiProviders.AnthropicClaude && (
        <AnthropicClaude form={form} />
      )}

      {activeTitle === AiProviders.GoogleGemini && <GoogleGemini form={form} />}

      {activeTitle === AiProviders.XaiGrok && <XaiGrok form={form} />}

      {activeTitle === AiProviders.Ollama && <Ollama form={form} />}

      {activeTitle === SettingLabel.AmazonS3 && <S3 form={form} />}

      {activeTitle === SettingLabel.AudioAndSpeech && (
        <AudioSpeech form={form} />
      )}

      {activeTitle === SettingLabel.ImageGeneration && (
        <ImageGeneration form={form} />
      )}

      {activeTitle === SettingLabel.GoogleMaps && <GoogleMaps form={form} />}

      {activeTitle === SettingLabel.WebSearch && <WebSearch form={form} />}

      {activeTitle === SettingLabel.DeepResearch && (
        <DeepResearch form={form} />
      )}

      {activeTitle === SettingLabel.MemoryLayer && <MemoryLayer form={form} />}

      {activeTitle === SettingLabel.BuiltinTools && <Tools form={form} />}

      {activeTitle === SettingLabel.SkillsMarket && <SkillsMarketSetting />}

      {activeTitle === SettingLabel.McpServers && <McpServers />}

      {activeTitle === SettingLabel.GraphRag && <GraphRAG />}

      {activeTitle === SettingLabel.ComputerUse && <UnderConstruction />}

      {activeTitle === SettingLabel.BrowserUse && <UnderConstruction />}

      {activeTitle === SettingLabel.DataControls && <DataControls />}

      {activeTitle === SettingLabel.AboutExodus && <SystemInfo />}
    </form>
  )
}
