import CodeEditor from '@/components/code-editor'
import { Button } from '@/components/ui/button'
import {
  Form,
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
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

const httpMethods = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'HEAD',
  'OPTIONS'
] as const
const requestModes = ['cors', 'no-cors', 'same-origin'] as const
const credentialsOptions = ['include', 'same-origin', 'omit'] as const
const cacheOptions = [
  'default',
  'no-store',
  'reload',
  'no-cache',
  'force-cache',
  'only-if-cached'
] as const
const redirectOptions = ['follow', 'error', 'manual'] as const
const referrerPolicyOptions = [
  'no-referrer',
  'no-referrer-when-downgrade',
  'origin',
  'origin-when-cross-origin',
  'same-origin',
  'strict-origin',
  'strict-origin-when-cross-origin',
  'unsafe-url'
] as const

const formSchema = z.object({
  url: z.string().url({ message: 'Please enter a valid URL' }),
  method: z.enum(httpMethods),
  headers: z.string(),
  queryParams: z.string(),
  body: z.string(),
  mode: z.enum(requestModes),
  credentials: z.enum(credentialsOptions),
  cache: z.enum(cacheOptions),
  redirect: z.enum(redirectOptions),
  referrerPolicy: z.enum(referrerPolicyOptions)
})

type FormData = z.infer<typeof formSchema>

const defaultValues: FormData = {
  url: '',
  method: 'GET',
  mode: 'cors',
  credentials: 'same-origin',
  cache: 'default',
  redirect: 'follow',
  referrerPolicy: 'strict-origin-when-cross-origin',
  headers: '{\n  "Content-Type": "application/json"\n}',
  queryParams: '{\n  \n}',
  body: '{\n  \n}'
}

export function HttpRequestForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange'
  })

  const onSubmit = form.handleSubmit((data) => {
    try {
      const transformedValues = {
        ...data,
        headers: JSON.parse(data.headers),
        queryParams: JSON.parse(data.queryParams),
        body: data.method !== 'GET' ? JSON.parse(data.body) : undefined
      }
      console.log(transformedValues)
    } catch (error) {
      console.error('Error parsing JSON fields:', error)
      form.setError('root', {
        message: 'Invalid JSON in one or more fields'
      })
    }
  })

  const method = form.watch('method')

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL</FormLabel>
              <FormControl>
                <Input placeholder="https://api.example.com/data" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Method</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {httpMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="headers"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Headers</FormLabel>
              <FormControl>
                <div className="h-50 rounded-md border">
                  <CodeEditor
                    props={field}
                    monacoEditorOption={{
                      lineNumbers: 'off',
                      scrollbar: {
                        vertical: 'hidden',
                        horizontal: 'hidden'
                      }
                    }}
                  />
                </div>
              </FormControl>
              <FormDescription>Enter headers as a JSON object</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="queryParams"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Query Parameters</FormLabel>
              <FormControl>
                <div className="h-50 rounded-md border">
                  <CodeEditor
                    props={field}
                    monacoEditorOption={{
                      lineNumbers: 'off',
                      scrollbar: {
                        vertical: 'hidden',
                        horizontal: 'hidden'
                      }
                    }}
                  />
                </div>
              </FormControl>
              <FormDescription>
                Enter query parameters as a JSON object
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {method !== 'GET' && (
          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Body</FormLabel>
                <FormControl>
                  <div className="h-50 rounded-md border">
                    <CodeEditor
                      props={field}
                      monacoEditorOption={{
                        lineNumbers: 'off',
                        scrollbar: {
                          vertical: 'hidden',
                          horizontal: 'hidden'
                        }
                      }}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Enter request body as a JSON object
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="space-y-4 rounded-lg border p-4">
          <h4 className="mb-4 font-medium">Advanced Options</h4>

          <FormField
            control={form.control}
            name="mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mode</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select request mode" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {requestModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="credentials"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Credentials</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select credentials mode" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {credentialsOptions.map((cred) => (
                      <SelectItem key={cred} value={cred}>
                        {cred}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cache"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cache</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cache mode" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {cacheOptions.map((cache) => (
                      <SelectItem key={cache} value={cache}>
                        {cache}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="redirect"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Redirect</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select redirect mode" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {redirectOptions.map((redirect) => (
                      <SelectItem key={redirect} value={redirect}>
                        {redirect}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="referrerPolicy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Referrer Policy</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select referrer policy" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {referrerPolicyOptions.map((policy) => (
                      <SelectItem key={policy} value={policy}>
                        {policy}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {form.formState.errors.root && (
          <p className="text-destructive text-sm font-medium">
            {form.formState.errors.root.message}
          </p>
        )}

        <Button type="submit">Send Request</Button>
      </form>
    </Form>
  )
}
