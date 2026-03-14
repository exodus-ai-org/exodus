import CodeEditor from '@/components/code-editor'
import { Button } from '@/components/ui/button'
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
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
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
    <form onSubmit={onSubmit} className="space-y-6">
      <Controller
        control={form.control}
        name="url"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>URL</FieldLabel>
            <Input placeholder="https://api.example.com/data" {...field} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="method"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Method</FieldLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select a method" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {httpMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="headers"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Headers</FieldLabel>
            <div className="h-50 rounded-md border">
              <CodeEditor
                props={field}
                monacoEditorOption={{
                  lineNumbers: 'off',
                  scrollbar: { vertical: 'hidden', horizontal: 'hidden' }
                }}
              />
            </div>
            <FieldDescription>Enter headers as a JSON object</FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="queryParams"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Query Parameters</FieldLabel>
            <div className="h-50 rounded-md border">
              <CodeEditor
                props={field}
                monacoEditorOption={{
                  lineNumbers: 'off',
                  scrollbar: { vertical: 'hidden', horizontal: 'hidden' }
                }}
              />
            </div>
            <FieldDescription>
              Enter query parameters as a JSON object
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {method !== 'GET' && (
        <Controller
          control={form.control}
          name="body"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Body</FieldLabel>
              <div className="h-50 rounded-md border">
                <CodeEditor
                  props={field}
                  monacoEditorOption={{
                    lineNumbers: 'off',
                    scrollbar: { vertical: 'hidden', horizontal: 'hidden' }
                  }}
                />
              </div>
              <FieldDescription>
                Enter request body as a JSON object
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      )}

      <div className="space-y-4 rounded-lg border p-4">
        <h4 className="mb-4 font-medium">Advanced Options</h4>

        <Controller
          control={form.control}
          name="mode"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Mode</FieldLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select request mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {requestModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="credentials"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Credentials</FieldLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select credentials mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {credentialsOptions.map((cred) => (
                      <SelectItem key={cred} value={cred}>
                        {cred}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="cache"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Cache</FieldLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cache mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {cacheOptions.map((cache) => (
                      <SelectItem key={cache} value={cache}>
                        {cache}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="redirect"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Redirect</FieldLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select redirect mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {redirectOptions.map((redirect) => (
                      <SelectItem key={redirect} value={redirect}>
                        {redirect}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="referrerPolicy"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Referrer Policy</FieldLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select referrer policy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {referrerPolicyOptions.map((policy) => (
                      <SelectItem key={policy} value={policy}>
                        {policy}
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

      {form.formState.errors.root && (
        <p className="text-destructive text-sm font-medium">
          {form.formState.errors.root.message}
        </p>
      )}

      <Button type="submit">Send Request</Button>
    </form>
  )
}
