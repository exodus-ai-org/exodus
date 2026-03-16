import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { countryCodes } from '@shared/constants/country-codes'
import { languageCodes } from '@shared/constants/language-codes'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { AlertCircleIcon, CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { Controller } from 'react-hook-form'

const URL_TO_MARKDOWN_PROVIDERS = [
  { value: 'jina', label: 'Jina(default)' },
  { value: 'builtin', label: 'Built-in' }
] as const

export function WebSearch({ form }: { form: UseFormReturnType }) {
  return (
    <>
      <Alert>
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription className="inline">
          Exodus uses{' '}
          <a
            href="https://docs.perplexity.ai/docs/search/quickstart"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            Perplexity Search
          </a>{' '}
          for real-time web results with built-in content extraction. A{' '}
          <strong>Perplexity API Key</strong> is required.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3">
        <Controller
          control={form.control}
          name="webSearch.perplexityApiKey"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Perplexity API Key</FieldLabel>
              <Input
                type="password"
                autoComplete="current-password"
                id="perplexity-api-key-input"
                autoFocus
                {...field}
                value={field.value ?? ''}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Separator />

        <Controller
          control={form.control}
          name="webSearch.country"
          render={({ field, fieldState }) => {
            const countryItem = countryCodes.find(
              ({ countryCode }) => countryCode === field.value
            )
            return (
              <Field data-invalid={fieldState.invalid}>
                <div className="flex items-center justify-between">
                  <FieldLabel>Country</FieldLabel>
                  <Popover modal>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            'hover:bg-accent w-fit justify-between border-none shadow-none',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {countryItem
                            ? `${countryItem.flag} ${countryItem.country}`
                            : 'Select country'}
                          <ChevronsUpDownIcon className="opacity-50" />
                        </Button>
                      }
                    />
                    <PopoverContent className="p-0" side="top">
                      <Command>
                        <CommandInput
                          placeholder="Search country..."
                          className="h-9"
                        />
                        <CommandList>
                          <CommandEmpty>No country found.</CommandEmpty>
                          <CommandGroup>
                            {countryCodes.map(
                              ({ flag, country, countryCode }) => (
                                <CommandItem
                                  value={countryCode}
                                  key={countryCode}
                                  onSelect={() => {
                                    form.setValue(
                                      'webSearch.country',
                                      countryCode
                                    )
                                  }}
                                >
                                  {flag} {country}
                                  <CheckIcon
                                    className={cn(
                                      'ml-auto',
                                      countryCode === field.value
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    )}
                                  />
                                </CommandItem>
                              )
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )
          }}
        />

        <Separator />

        <Controller
          control={form.control}
          name="webSearch.language"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="flex items-center justify-between">
                <FieldLabel>Language</FieldLabel>
                <Popover modal>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          'hover:bg-accent w-fit justify-between border-none shadow-none',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value
                          ? languageCodes.find(
                              ({ languageCode }) => languageCode === field.value
                            )?.language
                          : 'Select language'}
                        <ChevronsUpDownIcon className="opacity-50" />
                      </Button>
                    }
                  />
                  <PopoverContent className="w-[200px] p-0" side="top">
                    <Command>
                      <CommandInput
                        placeholder="Search language..."
                        className="h-9"
                      />
                      <CommandList>
                        <CommandEmpty>No language found.</CommandEmpty>
                        <CommandGroup>
                          {languageCodes.map(({ language, languageCode }) => (
                            <CommandItem
                              value={language}
                              key={languageCode}
                              onSelect={() => {
                                form.setValue(
                                  'webSearch.language',
                                  languageCode
                                )
                              }}
                            >
                              {language}
                              <CheckIcon
                                className={cn(
                                  'ml-auto',
                                  languageCode === field.value
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Separator />

        <Controller
          control={form.control}
          name="webSearch.urlToMarkdownProvider"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="flex items-center justify-between">
                <div>
                  <FieldLabel>URL to Markdown</FieldLabel>
                  <FieldDescription>
                    Used by the Web Fetch tool to convert pages to Markdown.
                  </FieldDescription>
                </div>
                <Select
                  value={field.value ?? 'jina'}
                  onValueChange={(val) =>
                    form.setValue(
                      'webSearch.urlToMarkdownProvider',
                      val as 'jina' | 'builtin'
                    )
                  }
                >
                  <SelectTrigger className="hover:bg-accent w-fit border-none shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {URL_TO_MARKDOWN_PROVIDERS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>
    </>
  )
}
