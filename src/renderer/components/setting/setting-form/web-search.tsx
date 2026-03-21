import { countryCodes } from '@shared/constants/country-codes'
import { languageCodes } from '@shared/constants/language-codes'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { AlertCircleIcon } from 'lucide-react'
import { Controller } from 'react-hook-form'

import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor
} from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'

import { SettingRow, SettingSection } from '../setting-row'
import { SettingSelect } from '../setting-select'

const RECENCY_OPTIONS = [
  { value: 'none', label: 'No filter' },
  { value: 'hour', label: 'Past hour' },
  { value: 'day', label: 'Past 24 hours' },
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month' },
  { value: 'year', label: 'Past year' }
]

const URL_TO_MARKDOWN_PROVIDERS = [
  { value: 'jina', label: 'Jina (default)' },
  { value: 'builtin', label: 'Built-in' }
] as const

type OptionItem = { label: string; value: string }

const countryItems: OptionItem[] = countryCodes.map((c) => ({
  label: `${c.flag} ${c.country}`,
  value: c.countryCode
}))

const languageItems: OptionItem[] = languageCodes.map((l) => ({
  label: l.language,
  value: l.languageCode
}))

export function WebSearch({ form }: { form: UseFormReturnType }) {
  const languageChipsAnchor = useComboboxAnchor()

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

      <SettingSection>
        {/* API Key */}
        <Controller
          control={form.control}
          name="webSearch.perplexityApiKey"
          render={({ field, fieldState }) => (
            <SettingRow
              label="Perplexity API Key"
              description="Required for web search. Get yours at perplexity.ai"
              error={fieldState.error}
              layout="vertical"
            >
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="pplx-..."
                autoFocus
                {...field}
                value={field.value ?? ''}
              />
            </SettingRow>
          )}
        />

        {/* Country */}
        <Controller
          control={form.control}
          name="webSearch.country"
          render={({ field, fieldState }) => (
            <SettingRow
              label="Country"
              description="Bias results toward a specific region"
              error={fieldState.error}
            >
              <Combobox
                items={countryItems}
                itemToStringValue={(item) => item.label}
                value={
                  field.value
                    ? (countryItems.find((c) => c.value === field.value) ??
                      null)
                    : null
                }
                onValueChange={(item) =>
                  form.setValue('webSearch.country', item?.value ?? null)
                }
              >
                <ComboboxInput
                  placeholder="Select country..."
                  showClear
                  className="w-52"
                />
                <ComboboxContent>
                  <ComboboxEmpty>No country found.</ComboboxEmpty>
                  <ComboboxList>
                    {(item) => (
                      <ComboboxItem key={item.value} value={item}>
                        {item.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </SettingRow>
          )}
        />

        {/* Languages (multi-select with chips) */}
        <Controller
          control={form.control}
          name="webSearch.languages"
          render={({ field, fieldState }) => {
            const selectedItems = (field.value ?? [])
              .map((code: string) =>
                languageItems.find((l) => l.value === code)
              )
              .filter(Boolean) as OptionItem[]
            return (
              <SettingRow
                label="Languages"
                description="Filter search results by language"
                error={fieldState.error}
                layout="vertical"
              >
                <Combobox
                  multiple
                  value={selectedItems}
                  onValueChange={(items) =>
                    form.setValue(
                      'webSearch.languages',
                      items.length > 0 ? items.map((i) => i.value) : null
                    )
                  }
                  items={languageItems}
                  itemToStringValue={(item) => item.label}
                >
                  <ComboboxChips ref={languageChipsAnchor}>
                    {selectedItems.map((item) => (
                      <ComboboxChip key={item.value}>{item.label}</ComboboxChip>
                    ))}
                    <ComboboxChipsInput placeholder="Search languages..." />
                  </ComboboxChips>
                  <ComboboxContent anchor={languageChipsAnchor}>
                    <ComboboxEmpty>No language found.</ComboboxEmpty>
                    <ComboboxList>
                      {(item) => (
                        <ComboboxItem key={item.value} value={item}>
                          {item.label}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </SettingRow>
            )
          }}
        />

        {/* Max Results */}
        <Controller
          control={form.control}
          name="webSearch.maxResults"
          render={({ field, fieldState }) => (
            <SettingRow
              label="Max Results"
              description="Number of search results per query (1-50). Default: 10."
              error={fieldState.error}
            >
              <Input
                type="number"
                min={1}
                max={50}
                className="w-20"
                placeholder="10"
                {...field}
                value={field.value ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  field.onChange(v === '' ? null : Number(v))
                }}
              />
            </SettingRow>
          )}
        />

        {/* Recency Filter */}
        <Controller
          control={form.control}
          name="webSearch.recencyFilter"
          render={({ field, fieldState }) => (
            <SettingRow
              label="Recency Filter"
              description="Only return results from a recent time period."
              error={fieldState.error}
            >
              <SettingSelect
                value={field.value ?? 'none'}
                onValueChange={(val) =>
                  form.setValue(
                    'webSearch.recencyFilter',
                    val === 'none'
                      ? null
                      : (val as 'hour' | 'day' | 'week' | 'month' | 'year')
                  )
                }
                options={RECENCY_OPTIONS}
                placeholder="No filter"
              />
            </SettingRow>
          )}
        />

        {/* Domain Filter */}
        <Controller
          control={form.control}
          name="webSearch.domainFilter"
          render={({ field, fieldState }) => (
            <SettingRow
              label="Domain Filter"
              description='Comma-separated. Prefix with - to exclude. e.g. "nature.com, .edu" or "-reddit.com"'
              error={fieldState.error}
              layout="vertical"
            >
              <Input
                placeholder="e.g. nature.com, .edu, -reddit.com"
                {...field}
                value={field.value ?? ''}
              />
            </SettingRow>
          )}
        />

        {/* URL to Markdown Provider */}
        <Controller
          control={form.control}
          name="webSearch.urlToMarkdownProvider"
          render={({ field, fieldState }) => (
            <SettingRow
              label="Web Fetch"
              description="Used by the Web Fetch tool to convert pages to Markdown."
              error={fieldState.error}
            >
              <SettingSelect
                value={field.value ?? 'jina'}
                onValueChange={(val) =>
                  form.setValue(
                    'webSearch.urlToMarkdownProvider',
                    val as 'jina' | 'builtin'
                  )
                }
                options={URL_TO_MARKDOWN_PROVIDERS.map((p) => ({
                  value: p.value,
                  label: p.label
                }))}
              />
            </SettingRow>
          )}
        />
      </SettingSection>
    </>
  )
}
