import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { AlertCircleIcon } from 'lucide-react'

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
      <FormField
        control={form.control}
        name="s3.region"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Region</FormLabel>
            <FormControl>
              <Input
                type="input"
                id="s3-region-input"
                placeholder="ap-northeast-1"
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="s3.bucket"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Bucket</FormLabel>
            <FormControl>
              <Input
                type="input"
                id="s3-bucket-input"
                placeholder="Your S3 bucket"
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="s3.accessKeyId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Access Key ID</FormLabel>
            <FormControl>
              <Input
                type="input"
                id="s3-accessKeyId-input"
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="s3.secretAccessKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Secret Access Key</FormLabel>
            <FormControl>
              <Input
                type="password"
                id="s3-secretAccessKey-input"
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
