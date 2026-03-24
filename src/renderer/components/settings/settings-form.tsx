import { zodResolver } from '@hookform/resolvers/zod'
import { Settings, SettingsSchema } from '@shared/schemas/settings-schema'
import { AiProviders } from '@shared/types/ai'
import { useAtomValue } from 'jotai'
import { useForm } from 'react-hook-form'

import { useSettings } from '@/hooks/use-settings'
import { settingsLabelAtom } from '@/stores/settings'

import { AudioSpeech } from './settings-form/audio-speech'
import { DataControls } from './settings-form/data-controls'
import { DeepResearch } from './settings-form/deep-research'
import { General } from './settings-form/generals'
import { GoogleMaps } from './settings-form/google-maps'
import { GraphRAG } from './settings-form/graph-rag'
import { ImageGeneration } from './settings-form/image-generation'
import { Logger } from './settings-form/logger'
import { McpServers } from './settings-form/mcp-servers'
import { MemoryLayer } from './settings-form/memory-layer'
import { ProviderConfig } from './settings-form/provider-config'
import { AnthropicClaude } from './settings-form/providers/anthropic-claude'
import { AzureOpenAi } from './settings-form/providers/azure-openai'
import { GoogleGemini } from './settings-form/providers/google-gemini'
import { Ollama } from './settings-form/providers/ollama'
import { OpenAiGpt } from './settings-form/providers/openai-gpt'
import { XaiGrok } from './settings-form/providers/xai-grok'
import { S3 } from './settings-form/s3'
import { SkillsMarketSetting } from './settings-form/skills-market'
import { SystemInfo } from './settings-form/system-info'
import { Tools } from './settings-form/tools'
import { WebSearch } from './settings-form/web-search'
import { SettingsLabel } from './settings-menu'
import { UnderConstruction } from './under-construction'

export function SettingsForm() {
  const { data: settings, updateSettings } = useSettings()
  const activeTitle = useAtomValue(settingsLabelAtom)

  const form = useForm({
    resolver: zodResolver(SettingsSchema),
    values: settings,
    resetOptions: { keepDirtyValues: true },
    mode: 'onBlur'
  })

  function onSubmit(values: Settings) {
    if (!settings) return
    updateSettings({ ...values, id: settings.id })
  }

  return (
    <form
      className="flex flex-1 flex-col gap-4"
      onBlur={form.handleSubmit(onSubmit)}
    >
      {activeTitle === SettingsLabel.General && <General form={form} />}

      {activeTitle === SettingsLabel.AiProviders && (
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

      {activeTitle === SettingsLabel.AmazonS3 && <S3 form={form} />}

      {activeTitle === SettingsLabel.AudioAndSpeech && (
        <AudioSpeech form={form} />
      )}

      {activeTitle === SettingsLabel.ImageGeneration && (
        <ImageGeneration form={form} />
      )}

      {activeTitle === SettingsLabel.GoogleMaps && <GoogleMaps form={form} />}

      {activeTitle === SettingsLabel.WebSearch && <WebSearch form={form} />}

      {activeTitle === SettingsLabel.DeepResearch && (
        <DeepResearch form={form} />
      )}

      {activeTitle === SettingsLabel.MemoryLayer && <MemoryLayer form={form} />}

      {activeTitle === SettingsLabel.BuiltinTools && <Tools form={form} />}

      {activeTitle === SettingsLabel.SkillsMarket && <SkillsMarketSetting />}

      {activeTitle === SettingsLabel.McpServers && <McpServers />}

      {activeTitle === SettingsLabel.GraphRag && <GraphRAG />}

      {activeTitle === SettingsLabel.ComputerUse && <UnderConstruction />}

      {activeTitle === SettingsLabel.BrowserUse && <UnderConstruction />}

      {activeTitle === SettingsLabel.DataControls && <DataControls />}

      {activeTitle === SettingsLabel.Logger && <Logger />}

      {activeTitle === SettingsLabel.AboutExodus && <SystemInfo />}
    </form>
  )
}
