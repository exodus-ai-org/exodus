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
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { AlertCircleIcon } from 'lucide-react'

export function MemoryLayer({ form }: { form: UseFormReturnType }) {
  const enable = form.watch('mem0.enable')

  return (
    <>
      <Alert className="mb-4">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription className="inline">
          This feature integrates{' '}
          <a
            href="https://mem0.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            Mem0.ai
          </a>
          , a memory layer that enables AI to store and recall personal context
          such as your preferences and history.
          <br />
          To activate this feature, please provide your{' '}
          <strong>Mem0 API Key</strong> and a unique user name.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3">
        <FormField
          control={form.control}
          name="mem0.enable"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <div className="my-2 flex items-center justify-between">
                <FormLabel className="mb-0">Enable Mem0</FormLabel>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
              <FormDescription>
                Allow AI to store and recall useful memories about you.
              </FormDescription>
            </FormItem>
          )}
        />

        {enable && (
          <>
            <Separator />
            <FormField
              control={form.control}
              name="mem0.mem0ApiKey"
              render={({ field }) => (
                <FormItem className="flex justify-between gap-16">
                  <FormLabel className="w-30 shrink-0">Mem0 API Key</FormLabel>
                  <FormControl className="w-full">
                    <Input
                      type="password"
                      autoComplete="current-password"
                      id="mem0-api-key-input"
                      autoFocus
                      {...field}
                      value={field.value ?? ''}
                      required
                      placeholder="Enter your Mem0 API Key"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            <FormField
              control={form.control}
              name="mem0.userName"
              render={({ field }) => (
                <FormItem className="flex justify-between gap-16">
                  <FormLabel className="w-30 shrink-0">
                    Mem0 User Name
                  </FormLabel>
                  <FormControl className="w-full">
                    <Input
                      id="memo-user-name-input"
                      autoFocus
                      {...field}
                      value={field.value ?? ''}
                      required
                      placeholder="e.g. Yancey"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </div>
    </>
  )
}
