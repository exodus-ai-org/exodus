import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { AlertCircleIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Controller } from 'react-hook-form'

type ModelParamValues = {
  [index: string]: {
    sizes: string[]
    qualities: string[]
    outputFormats?: string[]
    generatedCounts: { min: number; max: number }
    backgrounds?: string[]
  }
}

const modelParams: ModelParamValues = {
  'gpt-image-1': {
    sizes: ['1024x1024', '1536x1024', '1024x1536', 'auto'],
    qualities: ['high', 'medium', 'low', 'auto'],
    outputFormats: ['png', 'jpeg', 'webp'],
    generatedCounts: { min: 1, max: 10 },
    backgrounds: ['transparent', 'opaque', 'auto']
  },
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
    if (model === 'gpt-image-1') {
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

      <div className="flex flex-col gap-3">
        <Controller
          control={form.control}
          name="image.model"
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <FieldLabel>Model</FieldLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <SelectTrigger className="hover:bg-accent w-fit border-none shadow-none">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="gpt-image-1">gpt-image-1</SelectItem>
                    <SelectItem value="dall-e-3">dall-e-3</SelectItem>
                    <SelectItem value="dall-e-2">dall-e-2</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {paramsOfModel?.sizes ? (
          <>
            <Separator />
            <Controller
              control={form.control}
              name="image.size"
              render={({ field, fieldState }) => (
                <Field
                  orientation="horizontal"
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel>Size</FieldLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ''}
                  >
                    <SelectTrigger className="hover:bg-accent w-fit border-none shadow-none">
                      <SelectValue placeholder={paramsOfModel.sizes[0]} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {paramsOfModel.sizes.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </>
        ) : null}

        {paramsOfModel?.qualities ? (
          <>
            <Separator />
            <Controller
              control={form.control}
              name="image.quality"
              render={({ field, fieldState }) => (
                <Field
                  orientation="horizontal"
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel>Quality</FieldLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ''}
                  >
                    <SelectTrigger className="hover:bg-accent w-fit border-none shadow-none">
                      <SelectValue placeholder={paramsOfModel.qualities[0]} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {paramsOfModel.qualities.map((quality) => (
                          <SelectItem key={quality} value={quality}>
                            {quality}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </>
        ) : null}

        {paramsOfModel?.outputFormats ? (
          <>
            <Separator />
            <Controller
              control={form.control}
              name="image.outputFormat"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex items-center justify-between">
                    <FieldLabel>Output Format</FieldLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ''}
                    >
                      <SelectTrigger className="hover:bg-accent w-fit border-none shadow-none">
                        <SelectValue
                          placeholder={paramsOfModel?.outputFormats?.[0]}
                        />
                      </SelectTrigger>
                      <SelectContent>
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
                  </div>
                  <FieldDescription>
                    If the background is transparent, the output format should
                    be set to either png (default value) or webp.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </>
        ) : null}

        {paramsOfModel?.generatedCounts ? (
          <>
            <Separator />
            <Controller
              control={form.control}
              name="image.generatedCounts"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex items-center justify-between">
                    <FieldLabel>Generated Counts</FieldLabel>
                    <Input
                      type="number"
                      id="max-steps-input"
                      autoFocus
                      {...field}
                      min={paramsOfModel?.generatedCounts.min}
                      max={paramsOfModel?.generatedCounts.max}
                      value={field.value ?? 1}
                      className="w-fit"
                    />
                  </div>
                  <FieldDescription>
                    The number of images to generate. Must be between 1 and 10.
                    For dall-e-3, only 1 is supported.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </>
        ) : null}

        {paramsOfModel?.backgrounds ? (
          <>
            <Separator />
            <Controller
              control={form.control}
              name="image.background"
              render={({ field, fieldState }) => (
                <Field
                  orientation="horizontal"
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel>Background</FieldLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ''}
                  >
                    <SelectTrigger className="hover:bg-accent w-fit border-none shadow-none">
                      <SelectValue
                        placeholder={paramsOfModel?.backgrounds?.[0]}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {paramsOfModel?.backgrounds?.map((background) => (
                          <SelectItem key={background} value={background}>
                            {background}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </>
        ) : null}
      </div>
    </>
  )
}
