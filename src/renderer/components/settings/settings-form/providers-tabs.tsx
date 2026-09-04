import { UseFormReturnType } from '@shared/schemas/settings-schema'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { SettingsSection } from '../settings-row'
import { ProviderConfig } from './provider-config'
import { AnthropicClaude } from './providers/anthropic-claude'
import { AzureOpenAi } from './providers/azure-openai'
import { GoogleGemini } from './providers/google-gemini'
import { Ollama } from './providers/ollama'
import { OpenAiGpt } from './providers/openai-gpt'
import { XaiGrok } from './providers/xai-grok'

const PROVIDER_TABS = [
  { value: 'openai', label: 'OpenAI', Component: OpenAiGpt },
  { value: 'azure', label: 'Azure', Component: AzureOpenAi },
  { value: 'claude', label: 'Claude', Component: AnthropicClaude },
  { value: 'gemini', label: 'Gemini', Component: GoogleGemini },
  { value: 'grok', label: 'Grok', Component: XaiGrok },
  { value: 'ollama', label: 'Ollama', Component: Ollama }
] as const

export function ProvidersTabs({ form }: { form: UseFormReturnType }) {
  return (
    <div className="flex flex-col gap-8">
      <ProviderConfig form={form} />

      <SettingsSection title="Provider keys" plain>
        <Tabs defaultValue="openai" className="gap-5">
          <TabsList className="w-full">
            {PROVIDER_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {PROVIDER_TABS.map(({ value, Component }) => (
            <TabsContent key={value} value={value}>
              <Component form={form} />
            </TabsContent>
          ))}
        </Tabs>
      </SettingsSection>
    </div>
  )
}
