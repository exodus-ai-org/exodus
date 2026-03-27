import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { Controller } from 'react-hook-form'
import useSWR from 'swr'

import { Input } from '@/components/ui/input'
import { useSettings } from '@/hooks/use-settings'

import { SettingsRow, SettingsSection } from '../../settings-row'

export function Ollama({ form }: { form: UseFormReturnType }) {
  const { data: settings } = useSettings()
  const { error } = useSWR(
    settings?.providers?.ollamaBaseUrl
      ? `/api/tools/ping-ollama?url=${settings?.providers?.ollamaBaseUrl}`
      : null
  )

  const isRunning = !!settings?.providers?.ollamaBaseUrl && error === undefined

  return (
    <SettingsSection>
      <Controller
        control={form.control}
        name="providers.ollamaBaseUrl"
        render={({ field, fieldState }) => (
          <SettingsRow
            label="Base URL"
            description="Ollama server address for local model inference"
            error={fieldState.error}
            layout="vertical"
          >
            <Input
              type="text"
              placeholder="http://localhost:11434"
              autoFocus
              {...field}
              value={field.value ?? ''}
            />
          </SettingsRow>
        )}
      />
      <SettingsRow
        label="Status"
        description="Connection status of the Ollama server"
      >
        <div className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${isRunning ? 'bg-green-400' : 'bg-red-400'}`}
          />
          <p className="text-sm">
            {isRunning ? 'Ollama is running' : 'Not running'}
          </p>
        </div>
      </SettingsRow>
    </SettingsSection>
  )
}
