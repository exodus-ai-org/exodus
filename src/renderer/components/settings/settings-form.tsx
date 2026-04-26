import { zodResolver } from '@hookform/resolvers/zod'
import { Settings, SettingsSchema } from '@shared/schemas/settings-schema'
import { AiProviders } from '@shared/types/ai'
import { useAtomValue } from 'jotai'
import { useEffect, useRef } from 'react'
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
import { KeyboardShortcuts } from './settings-form/keyboard-shortcuts'
import { Logger } from './settings-form/logger'
import { McpServers } from './settings-form/mcp-servers'
import { MemoryLayer } from './settings-form/memory-layer'
import { Personality } from './settings-form/personality'
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
    resetOptions: { keepDirtyValues: true }
  })

  // Refs let the watch effect read latest closure without re-subscribing on
  // every render of the parent. The watch subscription must outlive the
  // section-tab swaps that re-render this component.
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const updateSettingsRef = useRef(updateSettings)
  updateSettingsRef.current = updateSettings

  // Auto-save: subscribe to any user-initiated value change (typed input,
  // Switch toggle, Select pick, programmatic setValue) and persist once the
  // schema validates. Debounced so a burst of keystrokes coalesces into one
  // write. Replaces the old `onBlur={handleSubmit(...)}` form handler, which
  // missed Switch/Select changes and fired spurious saves on tab switches.
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const persist = (values: Settings) => {
      const current = settingsRef.current
      if (!current) return
      updateSettingsRef.current({ ...values, id: current.id })
    }
    const flush = () => {
      timeoutId = null
      // handleSubmit runs the Zod resolver; persist only fires for valid values.
      void form.handleSubmit(persist)()
    }
    const subscription = form.watch((values, { name }) => {
      // RHF emits a watch event with `name` undefined when the `values: settings`
      // prop hydrates the form on mount or when reset() is called — skip those
      // so loading from the DB doesn't immediately echo-save.
      if (!name) return
      // Echo guard: after a save, the server bumps `updatedAt` and refetches
      // through SWR. RHF then resets the form to the new values and emits a
      // watch event for the changed timestamp field, which would otherwise
      // trigger another save → infinite POST loop. Compare what we'd save
      // against the persisted settings; equal means there's nothing new.
      const current = settingsRef.current
      if (current && JSON.stringify(values) === JSON.stringify(current)) return
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(flush, 300)
    })
    return () => {
      subscription.unsubscribe()
      if (timeoutId) {
        clearTimeout(timeoutId)
        // Flush any pending save when the component unmounts (navigating away
        // from /settings) so the last edit isn't dropped.
        flush()
      }
    }
  }, [form])

  return (
    <form className="flex flex-1 flex-col gap-4">
      {activeTitle === SettingsLabel.General && <General form={form} />}

      {activeTitle === SettingsLabel.Personality && <Personality form={form} />}

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

      {activeTitle === SettingsLabel.KeyboardShortcuts && <KeyboardShortcuts />}

      {activeTitle === SettingsLabel.AboutExodus && <SystemInfo form={form} />}
    </form>
  )
}
