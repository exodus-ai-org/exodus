import {
  FormControl,
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
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { TooltipArrow } from '@radix-ui/react-tooltip'
import { models } from '@shared/constants/models'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { Providers } from '@shared/types/ai'
import { Info } from 'lucide-react'
import { useMemo } from 'react'

export function ProviderConfig({ form }: { form: UseFormReturnType }) {
  const provider = form.watch('providerConfig.provider')

  const modelsOfProvider = useMemo(() => {
    if (provider) return models[provider as Providers]
    return null
  }, [provider])

  return (
    <div className="flex flex-col gap-3">
      <FormField
        control={form.control}
        name="providerConfig.provider"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between">
            <FormLabel className="mb-0">Provider</FormLabel>
            <Select
              value={field.value ?? ''}
              onValueChange={(value) => {
                field.onChange(value)
                form.setValue('providerConfig.chatModel', '')
                form.setValue('providerConfig.reasoningModel', '')
              }}
            >
              <FormControl className="mb-0 w-fit">
                <SelectTrigger className="hover:bg-accent border-none shadow-none">
                  <SelectValue placeholder="Select a provider" />
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
      <Separator />
      <FormField
        control={form.control}
        name="providerConfig.chatModel"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between">
            <FormLabel className="mb-0">Chat Model</FormLabel>
            <Select
              disabled={!provider}
              onValueChange={field.onChange}
              value={field.value ?? ''}
            >
              <FormControl className="mb-0 w-fit">
                <SelectTrigger className="hover:bg-accent border-none shadow-none">
                  <SelectValue
                    placeholder={
                      provider
                        ? 'Select a chat model'
                        : 'Select a provider first'
                    }
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
      <Separator />
      <FormField
        control={form.control}
        name="providerConfig.reasoningModel"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between">
            <FormLabel className="mb-0">Reasoning Model</FormLabel>
            <Select
              disabled={!provider}
              onValueChange={field.onChange}
              value={field.value ?? ''}
            >
              <FormControl className="mb-0 w-fit">
                <SelectTrigger className="hover:bg-accent border-none shadow-none">
                  <SelectValue
                    placeholder={
                      provider
                        ? 'Select a reasoning model'
                        : 'Select a provider first'
                    }
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
      <Separator />
      <FormField
        control={form.control}
        name="providerConfig.embeddingModel"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between">
            <FormLabel className="mb-0">Embedding Model</FormLabel>
            <Select
              disabled={!provider}
              onValueChange={field.onChange}
              value={field.value ?? ''}
            >
              <FormControl className="mb-0 w-fit">
                <SelectTrigger className="hover:bg-accent border-none shadow-none">
                  <SelectValue
                    placeholder={
                      provider
                        ? 'Select a embedding model'
                        : 'Select a provider first'
                    }
                  />
                </SelectTrigger>
              </FormControl>
              <FormMessage />
              <SelectContent>
                {modelsOfProvider?.embeddingModel?.map((val) => (
                  <SelectItem key={val} value={val}>
                    {val}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
      <Separator />
      <FormField
        control={form.control}
        name="providerConfig.maxSteps"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between">
            <FormLabel className="mb-0">
              Max Steps
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="text-ring h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-60">
                      Maximum number of sequential LLM calls (steps), e.g. when
                      you use tool calls. A maximum number is required to
                      prevent infinite loops in the case of misconfigured tools.
                      By default, it is set to 1.
                    </p>
                    <TooltipArrow className="TooltipArrow" />
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </FormLabel>
            <FormControl className="w-fit">
              <Input
                type="number"
                id="max-steps-input"
                autoFocus
                {...field}
                value={field.value ?? 1}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
