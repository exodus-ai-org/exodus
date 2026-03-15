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
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
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
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  ExternalLinkIcon,
  InfoIcon
} from 'lucide-react'
import { Controller } from 'react-hook-form'

const URL_TO_MARKDOWN_PROVIDERS = [
  { value: 'default', label: 'Default (built-in)' },
  { value: 'jina', label: 'Jina Reader' },
  { value: 'cloudflare', label: 'Cloudflare Browser Rendering' }
] as const

export function WebSearch({ form }: { form: UseFormReturnType }) {
  const provider = form.watch('webSearch.urlToMarkdownProvider')

  return (
    <>
      <Alert>
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription className="inline">
          Exodus supports built-in Web Search using{' '}
          <a
            href="https://brave.com/search/api/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            Brave Search
          </a>{' '}
          to retrieve search results. To utilize the feature, you must first
          register for a <strong>Brave Search API Key</strong>.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3">
        <Controller
          control={form.control}
          name="webSearch.braveApiKey"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Brave API Key</FieldLabel>
              <Input
                type="password"
                autoComplete="current-password"
                id="brave-search-api-key-input"
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
                <FieldLabel>URL to Markdown</FieldLabel>
                <Select
                  value={field.value ?? 'default'}
                  onValueChange={(val) =>
                    form.setValue(
                      'webSearch.urlToMarkdownProvider',
                      val as 'default' | 'jina' | 'cloudflare'
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

        {provider === 'cloudflare' && (
          <>
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription className="space-y-1">
                <p>
                  Cloudflare Browser Rendering requires enabling the service in
                  your Cloudflare Dashboard and creating an API Token with the{' '}
                  <strong>Browser Rendering</strong> permission.
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                  <a
                    href="https://developers.cloudflare.com/browser-rendering/get-started/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold underline"
                  >
                    Get started <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                  <a
                    href="https://developers.cloudflare.com/browser-rendering/rest-api/crawl-endpoint/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold underline"
                  >
                    Crawl API docs <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                  <a
                    href="https://dash.cloudflare.com/profile/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold underline"
                  >
                    Create API Token <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                </div>
              </AlertDescription>
            </Alert>

            <Controller
              control={form.control}
              name="webSearch.cloudflareAccountId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Cloudflare Account ID</FieldLabel>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    placeholder="Your Cloudflare account ID"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="webSearch.cloudflareApiToken"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Cloudflare API Token</FieldLabel>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    {...field}
                    value={field.value ?? ''}
                    placeholder="Token with Browser Rendering permission"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </>
        )}
      </div>
    </>
  )
}
