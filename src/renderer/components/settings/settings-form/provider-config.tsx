import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { models } from '@/lib/ai/models'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { Providers } from '@shared/types/ai'
import { useMemo } from 'react'

export function ProviderConfig({ form }: { form: UseFormReturnType }) {
  const provider = form.watch('providerConfig.provider')

  const modelsOfProvider = useMemo(() => {
    if (provider) return models[provider as Providers]
    return null
  }, [provider])

  return (
    <>
      <FormField
        control={form.control}
        name="providerConfig.provider"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Provider</FormLabel>
            <Select
              value={field.value ?? ''}
              onValueChange={(value) => {
                field.onChange(value)
                form.setValue('providerConfig.chatModel', '')
                form.setValue('providerConfig.reasoningModel', '')
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={Providers.OpenAiGpt} />
                </SelectTrigger>
              </FormControl>
              <FormMessage />
              <SelectContent>
                {Object.values(Providers).map((val) => (
                  <SelectItem key={val} value={val}>
                    {val}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="providerConfig.chatModel"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Chat Model</FormLabel>
            <Select
              disabled={!provider}
              onValueChange={field.onChange}
              value={field.value ?? ''}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue
                    placeholder={`Select a chat model belongs to ${provider}`}
                  />
                </SelectTrigger>
              </FormControl>
              <FormMessage />
              <SelectContent>
                {modelsOfProvider?.chatModel?.map((val) => (
                  <SelectItem key={val} value={val}>
                    {val}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="providerConfig.reasoningModel"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Reasoning Model</FormLabel>
            <Select
              disabled={!provider}
              onValueChange={field.onChange}
              value={field.value ?? ''}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue
                    placeholder={`Select a reasoning model belongs to ${provider}`}
                  />
                </SelectTrigger>
              </FormControl>
              <FormMessage />
              <SelectContent>
                {modelsOfProvider?.reasoningModel?.map((val) => (
                  <SelectItem key={val} value={val}>
                    {val}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="providerConfig.maxSteps"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Max Steps</FormLabel>
            <FormControl>
              <Input
                type="number"
                id="max-steps-input"
                autoFocus
                {...field}
                value={field.value ?? 1}
              />
            </FormControl>
            <FormDescription>
              Maximum number of sequential LLM calls (steps), e.g. when you use
              tool calls. A maximum number is required to prevent infinite loops
              in the case of misconfigured tools. By default, it is set to 1.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
