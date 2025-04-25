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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { countryCodes } from '@shared/constants/country-codes'
import { languageCodes } from '@shared/constants/language-codes'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { AlertCircle, Check, ChevronsUpDown } from 'lucide-react'

export function WebSearch({ form }: { form: UseFormReturnType }) {
  return (
    <>
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="inline">
          Exodus supports built-in Web Search using{' '}
          <a
            href="https://serper.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            Serper
          </a>{' '}
          to retrieve Google Search results. To utilize the feature, you must
          first register for a <strong>Serper API Key</strong>.
        </AlertDescription>
      </Alert>
      <FormField
        control={form.control}
        name="webSearch.serperApiKey"
        render={({ field }) => (
          <FormItem className="flex justify-between gap-16">
            <FormLabel className="shrink-0">Serper API Key</FormLabel>
            <FormControl className="w-full">
              <Input
                type="password"
                autoComplete="current-password"
                id="google-search-api-key-input"
                autoFocus
                {...field}
                value={field.value ?? ''}
                required
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Separator className="-my-2" />
      <FormField
        control={form.control}
        name="webSearch.country"
        render={({ field }) => {
          const countryItem = countryCodes.find(
            ({ countryCode }) => countryCode === field.value
          )
          return (
            <FormItem className="flex justify-between">
              <FormLabel>Country</FormLabel>
              <Popover modal>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        'hover:bg-accent w-[200px] justify-between border-none shadow-none',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {countryItem
                        ? `${countryItem.flag} ${countryItem.country}`
                        : 'Select country'}

                      <ChevronsUpDown className="opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="p-0" side="top">
                  <Command>
                    <CommandInput
                      placeholder="Search country..."
                      className="h-9"
                    />
                    <CommandList>
                      <CommandEmpty>No country found.</CommandEmpty>
                      <CommandGroup>
                        {countryCodes.map(({ flag, country, countryCode }) => (
                          <CommandItem
                            value={countryCode}
                            key={countryCode}
                            onSelect={() => {
                              form.setValue('webSearch.country', countryCode)
                            }}
                          >
                            {flag} {country}
                            <Check
                              className={cn(
                                'ml-auto',
                                countryCode === field.value
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
              <FormMessage />
            </FormItem>
          )
        }}
      />
      <Separator className="-my-2" />
      <FormField
        control={form.control}
        name="webSearch.language"
        render={({ field }) => (
          <FormItem className="flex justify-between">
            <FormLabel>Language</FormLabel>
            <Popover modal>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      'hover:bg-accent w-[200px] justify-between border-none shadow-none',
                      !field.value && 'text-muted-foreground'
                    )}
                  >
                    {field.value
                      ? languageCodes.find(
                          ({ languageCode }) => languageCode === field.value
                        )?.language
                      : 'Select language'}
                    <ChevronsUpDown className="opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
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
                            form.setValue('webSearch.language', languageCode)
                          }}
                        >
                          {language}
                          <Check
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
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
