import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { Separator } from '@/components/ui/separator'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { AlertCircle } from 'lucide-react'
import { useEffect, useMemo } from 'react'

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
    form.setValue('image.outputFormat', null)
    form.setValue('image.background', null)
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
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="inline">
          The Image Generation service <strong>only supports OpenAI</strong>.
          Please make sure you have configured the OpenAI API settings correctly
          before using these features.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3">
        <FormField
          control={form.control}
          name="image.model"
          render={({ field }) => (
            <FormItem className="flex justify-between">
              <FormLabel className="mb-0">Model</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl className="mb-0 w-fit">
                  <SelectTrigger className="hover:bg-accent border-none shadow-none">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                </FormControl>
                <FormMessage />
                <SelectContent>
                  <SelectItem value="gpt-image-1">gpt-image-1</SelectItem>
                  <SelectItem value="dall-e-3">dall-e-3</SelectItem>
                  <SelectItem value="dall-e-2">dall-e-2</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        {paramsOfModel?.sizes ? (
          <>
            <Separator />
            <FormField
              control={form.control}
              name="image.size"
              render={({ field }) => (
                <FormItem className="flex justify-between">
                  <FormLabel className="mb-0">Size</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ''}
                  >
                    <FormControl className="mb-0 w-fit">
                      <SelectTrigger className="hover:bg-accent border-none shadow-none">
                        <SelectValue placeholder={paramsOfModel.sizes[0]} />
                      </SelectTrigger>
                    </FormControl>
                    <FormMessage />
                    <SelectContent>
                      {paramsOfModel.sizes.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </>
        ) : null}

        {paramsOfModel?.qualities ? (
          <>
            <Separator />
            <FormField
              control={form.control}
              name="image.quality"
              render={({ field }) => (
                <FormItem className="flex justify-between">
                  <FormLabel className="mb-0">Quality</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ''}
                  >
                    <FormControl className="mb-0 w-fit">
                      <SelectTrigger className="hover:bg-accent border-none shadow-none">
                        <SelectValue placeholder={paramsOfModel.qualities[0]} />
                      </SelectTrigger>
                    </FormControl>
                    <FormMessage />
                    <SelectContent>
                      {paramsOfModel.qualities.map((quality) => (
                        <SelectItem key={quality} value={quality}>
                          {quality}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </>
        ) : null}

        {paramsOfModel?.outputFormats ? (
          <>
            <Separator />
            <FormField
              control={form.control}
              name="image.outputFormat"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <FormLabel className="mb-0">Output Format</FormLabel>

                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ''}
                    >
                      <FormControl className="mb-0 w-fit">
                        <SelectTrigger className="hover:bg-accent border-none shadow-none">
                          <SelectValue
                            placeholder={paramsOfModel?.outputFormats?.[0]}
                          />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
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
                      </SelectContent>
                    </Select>
                  </div>
                  <FormDescription>
                    If the background is transparent, the output format should
                    be set to either png (default value) or webp.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : null}

        {paramsOfModel?.generatedCounts ? (
          <>
            <Separator />
            <FormField
              control={form.control}
              name="image.generatedCounts"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <FormLabel className="mb-0">Generated Counts</FormLabel>
                    <FormControl className="w-fit">
                      <Input
                        type="number"
                        id="max-steps-input"
                        autoFocus
                        {...field}
                        min={paramsOfModel?.generatedCounts.min}
                        max={paramsOfModel?.generatedCounts.max}
                        value={field.value ?? 1}
                      />
                    </FormControl>
                  </div>

                  <FormDescription>
                    The number of images to generate. Must be between 1 and 10.
                    For dall-e-3, only 1 is supported.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : null}

        {paramsOfModel?.backgrounds ? (
          <>
            <Separator />
            <FormField
              control={form.control}
              name="image.background"
              render={({ field }) => (
                <FormItem className="flex justify-between">
                  <FormLabel className="mb-0">Background</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ''}
                  >
                    <FormControl className="mb-0 w-fit">
                      <SelectTrigger className="hover:bg-accent border-none shadow-none">
                        <SelectValue
                          placeholder={paramsOfModel?.backgrounds?.[0]}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <FormMessage />
                    <SelectContent>
                      {paramsOfModel?.backgrounds?.map((background) => (
                        <SelectItem key={background} value={background}>
                          {background}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </>
        ) : null}
      </div>
    </>
  )
}
