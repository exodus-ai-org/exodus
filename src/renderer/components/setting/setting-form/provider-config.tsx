import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

import { models } from '@shared/constants/models'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { AiProviders } from '@shared/types/ai'
import { useMemo } from 'react'
import { Controller } from 'react-hook-form'

export function ProviderConfig({ form }: { form: UseFormReturnType }) {
  const provider = form.watch('providerConfig.provider')

  const modelsOfProvider = useMemo(() => {
    if (provider) return models[provider as AiProviders]
    return null
  }, [provider])

  return (
    <div className="flex flex-col gap-3">
      <Controller
        control={form.control}
        name="providerConfig.provider"
        render={({ field, fieldState }) => (
          <Field orientation="horizontal" data-invalid={fieldState.invalid}>
            <FieldLabel>Provider</FieldLabel>
            <Select
              value={field.value ?? ''}
              onValueChange={(value) => {
                field.onChange(value)
                form.setValue('providerConfig.chatModel', '')
                form.setValue('providerConfig.reasoningModel', '')
              }}
            >
              <SelectTrigger className="hover:bg-accent w-fit border-none shadow-none">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Object.values(AiProviders).map((val) => (
                    <SelectItem key={val} value={val}>
                      {val}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Separator />
      <Controller
        control={form.control}
        name="providerConfig.chatModel"
        render={({ field, fieldState }) => (
          <Field orientation="horizontal" data-invalid={fieldState.invalid}>
            <FieldLabel>Chat Model</FieldLabel>
            <Select
              disabled={!provider}
              onValueChange={field.onChange}
              value={field.value ?? ''}
            >
              <SelectTrigger className="hover:bg-accent w-fit border-none shadow-none">
                <SelectValue
                  placeholder={
                    provider ? 'Select a chat model' : 'Select a provider first'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {modelsOfProvider?.chatModel?.map((val) => (
                    <SelectItem key={val} value={val}>
                      {val}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Separator />
      <Controller
        control={form.control}
        name="providerConfig.reasoningModel"
        render={({ field, fieldState }) => (
          <Field orientation="horizontal" data-invalid={fieldState.invalid}>
            <FieldLabel>Reasoning Model</FieldLabel>
            <Select
              disabled={!provider}
              onValueChange={field.onChange}
              value={field.value ?? ''}
            >
              <SelectTrigger className="hover:bg-accent w-fit border-none shadow-none">
                <SelectValue
                  placeholder={
                    provider
                      ? 'Select a reasoning model'
                      : 'Select a provider first'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {modelsOfProvider?.reasoningModel?.map((val) => (
                    <SelectItem key={val} value={val}>
                      {val}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </div>
  )
}
