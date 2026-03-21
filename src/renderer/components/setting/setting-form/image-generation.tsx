import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { AlertCircleIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Controller } from 'react-hook-form'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

import { SettingRow, SettingSection } from '../setting-row'
import { SettingSelect } from '../setting-select'

type ModelParamValues = {
  [index: string]: {
    sizes: string[]
    qualities: string[]
    outputFormats?: string[]
    generatedCounts: { min: number; max: number }
    backgrounds?: string[]
  }
}

const gptImageParams = {
  sizes: ['1024x1024', '1536x1024', '1024x1536', 'auto'],
  qualities: ['high', 'medium', 'low', 'auto'],
  outputFormats: ['png', 'jpeg', 'webp'],
  generatedCounts: { min: 1, max: 10 },
  backgrounds: ['transparent', 'opaque', 'auto']
}

const modelParams: ModelParamValues = {
  'gpt-image-1.5': gptImageParams,
  'gpt-image-1': gptImageParams,
  'gpt-image-1-mini': gptImageParams,
  'dall-e-3': {
    sizes: ['1024x1024', '1792x1024', '1024x1792'],
    qualities: ['hd', 'standard', 'auto'],
    generatedCounts: { min: 1, max: 1 }
  },
  'dall-e-2': {
    sizes: ['256x256', '512x512', '1024x1024', 'auto'],
    qualities: ['standard', 'auto'],
    generatedCounts: { min: 1, max: 10 }
  }
}

export function ImageGeneration({ form }: { form: UseFormReturnType }) {
  const background = form.watch('image.background')
  const model = form.watch('image.model')
  const paramsOfModel = useMemo(
    () => (model ? modelParams[model] : null),
    [model]
  )

  useEffect(() => {
    form.setValue('image.size', 'auto')
    form.setValue('image.quality', 'auto')
    form.setValue('image.outputFormat', '')
    form.setValue('image.background', '')
    form.setValue('image.generatedCounts', 1)
  }, [form, model])

  useEffect(() => {
    if (model?.startsWith('gpt-image-')) {
      if (background === 'transparent') {
        form.setValue('image.outputFormat', 'png')
      }
    }
  }, [background, form, model])

  return (
    <>
      <Alert>
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription className="inline">
          The Image Generation service <strong>only supports OpenAI</strong>.
          Please make sure you have configured the OpenAI API setting correctly
          before using these features.
        </AlertDescription>
      </Alert>

      <SettingSection>
        <Controller
          control={form.control}
          name="image.model"
          render={({ field, fieldState }) => (
            <SettingRow
              label="Model"
              description="Select the image generation model to use."
              error={fieldState.error}
            >
              <SettingSelect
                value={field.value ?? ''}
                onValueChange={field.onChange}
                placeholder="Select a model"
                options={[
                  { value: 'gpt-image-1.5', label: 'gpt-image-1.5' },
                  { value: 'gpt-image-1', label: 'gpt-image-1' },
                  { value: 'gpt-image-1-mini', label: 'gpt-image-1-mini' },
                  { value: 'dall-e-3', label: 'dall-e-3' },
                  { value: 'dall-e-2', label: 'dall-e-2' }
                ]}
              />
            </SettingRow>
          )}
        />

        {paramsOfModel?.sizes ? (
          <Controller
            control={form.control}
            name="image.size"
            render={({ field, fieldState }) => (
              <SettingRow
                label="Size"
                description="The dimensions of the generated image."
                error={fieldState.error}
              >
                <SettingSelect
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  placeholder={paramsOfModel.sizes[0]}
                  options={paramsOfModel.sizes.map((size) => ({
                    value: size,
                    label: size
                  }))}
                />
              </SettingRow>
            )}
          />
        ) : null}

        {paramsOfModel?.qualities ? (
          <Controller
            control={form.control}
            name="image.quality"
            render={({ field, fieldState }) => (
              <SettingRow
                label="Quality"
                description="The quality level of the generated image."
                error={fieldState.error}
              >
                <SettingSelect
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  placeholder={paramsOfModel.qualities[0]}
                  options={paramsOfModel.qualities.map((quality) => ({
                    value: quality,
                    label: quality
                  }))}
                />
              </SettingRow>
            )}
          />
        ) : null}

        {paramsOfModel?.outputFormats ? (
          <Controller
            control={form.control}
            name="image.outputFormat"
            render={({ field, fieldState }) => (
              <SettingRow
                label="Output Format"
                description="If the background is transparent, the output format should be set to either png (default) or webp."
                error={fieldState.error}
              >
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? ''}
                >
                  <SelectTrigger className="hover:bg-accent w-fit border-none shadow-none">
                    <SelectValue
                      placeholder={paramsOfModel?.outputFormats?.[0]}
                    />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    <SelectGroup>
                      {paramsOfModel?.outputFormats?.map((outputFormat) => (
                        <SelectItem
                          key={outputFormat}
                          value={outputFormat}
                          disabled={
                            background === 'transparent' &&
                            outputFormat === 'jpeg'
                          }
                        >
                          {outputFormat}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </SettingRow>
            )}
          />
        ) : null}

        {paramsOfModel?.generatedCounts ? (
          <Controller
            control={form.control}
            name="image.generatedCounts"
            render={({ field, fieldState }) => (
              <SettingRow
                label="Generated Counts"
                description="The number of images to generate. Must be between 1 and 10. For dall-e-3, only 1 is supported."
                error={fieldState.error}
              >
                <Input
                  type="number"
                  id="max-steps-input"
                  autoFocus
                  {...field}
                  min={paramsOfModel?.generatedCounts.min}
                  max={paramsOfModel?.generatedCounts.max}
                  value={field.value ?? ''}
                  className="w-fit"
                />
              </SettingRow>
            )}
          />
        ) : null}

        {paramsOfModel?.backgrounds ? (
          <Controller
            control={form.control}
            name="image.background"
            render={({ field, fieldState }) => (
              <SettingRow
                label="Background"
                description="Set the background style for the generated image."
                error={fieldState.error}
              >
                <SettingSelect
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  placeholder={paramsOfModel?.backgrounds?.[0]}
                  options={
                    paramsOfModel?.backgrounds?.map((bg) => ({
                      value: bg,
                      label: bg
                    })) ?? []
                  }
                />
              </SettingRow>
            )}
          />
        ) : null}
      </SettingSection>
    </>
  )
}
