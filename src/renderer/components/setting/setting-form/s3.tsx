import { Alert, AlertDescription } from '@/components/ui/alert'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { AlertCircleIcon } from 'lucide-react'
import { Controller } from 'react-hook-form'

export function S3({ form }: { form: UseFormReturnType }) {
  return (
    <>
      <Alert className="mb-4">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription className="inline">
          By default, Exodus encodes uploaded attachments into{' '}
          <strong>base64</strong> for prompt integration. To use your own S3
          bucket, configure it here.
        </AlertDescription>
      </Alert>
      <Controller
        control={form.control}
        name="s3.region"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Region</FieldLabel>
            <Input
              type="input"
              id="s3-region-input"
              placeholder="ap-northeast-1"
              {...field}
              value={field.value ?? ''}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        control={form.control}
        name="s3.bucket"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Bucket</FieldLabel>
            <Input
              type="input"
              id="s3-bucket-input"
              placeholder="Your S3 bucket"
              {...field}
              value={field.value ?? ''}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        control={form.control}
        name="s3.accessKeyId"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Access Key ID</FieldLabel>
            <Input
              type="input"
              id="s3-accessKeyId-input"
              {...field}
              value={field.value ?? ''}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        control={form.control}
        name="s3.secretAccessKey"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Secret Access Key</FieldLabel>
            <Input
              type="password"
              id="s3-secretAccessKey-input"
              {...field}
              value={field.value ?? ''}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </>
  )
}
