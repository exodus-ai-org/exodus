import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { AlertCircleIcon } from 'lucide-react'
import { Controller } from 'react-hook-form'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'

import { SettingRow, SettingSection } from '../setting-row'

export function S3({ form }: { form: UseFormReturnType }) {
  return (
    <>
      <Alert className="mb-4">
        <AlertCircleIcon className="size-4" data-icon />
        <AlertDescription className="flex flex-col gap-2 text-sm">
          <p>
            By default, Exodus encodes attachments as <strong>base64</strong>{' '}
            inline in the prompt. For large files or vision-heavy workflows,
            uploading to S3 and passing a URL is more efficient and reliable.
          </p>
          <p>
            <strong>Requirements before configuring:</strong>
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-4">
            <li>
              <strong>Public read access</strong> — AWS blocks public access by
              default. You must disable "Block all public access" on the bucket
              and attach a bucket policy granting <code>s3:GetObject</code> to{' '}
              <code>*</code>, so the AI provider can fetch the URL without
              credentials.
            </li>
            <li>
              <strong>CORS</strong> — Add a CORS rule allowing <code>PUT</code>{' '}
              from <code>*</code> (or your app origin) so Exodus can upload
              directly from the desktop.
            </li>
            <li>
              <strong>IAM credentials</strong> — The Access Key ID / Secret
              Access Key must belong to an IAM user or role with at least{' '}
              <code>s3:PutObject</code> and <code>s3:PutObjectAcl</code>{' '}
              permissions on the configured bucket.
            </li>
            <li>
              <strong>Object ACL</strong> — Each uploaded object is set to{' '}
              <code>public-read</code>. Your bucket must not have ACLs disabled
              (i.e., Object Ownership must be set to{' '}
              <em>ACLs enabled / Bucket owner preferred</em>).
            </li>
          </ul>
        </AlertDescription>
      </Alert>
      <SettingSection>
        <Controller
          control={form.control}
          name="s3.region"
          render={({ field, fieldState }) => (
            <SettingRow
              label="Region"
              description="The AWS region where your S3 bucket is hosted."
              error={fieldState.error}
              layout="vertical"
            >
              <Input
                type="input"
                id="s3-region-input"
                placeholder="ap-northeast-1"
                {...field}
                value={field.value ?? ''}
              />
            </SettingRow>
          )}
        />
        <Controller
          control={form.control}
          name="s3.bucket"
          render={({ field, fieldState }) => (
            <SettingRow
              label="Bucket"
              description="The name of your S3 bucket for file uploads."
              error={fieldState.error}
              layout="vertical"
            >
              <Input
                type="input"
                id="s3-bucket-input"
                placeholder="Your S3 bucket"
                {...field}
                value={field.value ?? ''}
              />
            </SettingRow>
          )}
        />
        <Controller
          control={form.control}
          name="s3.accessKeyId"
          render={({ field, fieldState }) => (
            <SettingRow
              label="Access Key ID"
              description="The IAM access key ID with S3 write permissions."
              error={fieldState.error}
              layout="vertical"
            >
              <Input
                type="input"
                id="s3-accessKeyId-input"
                {...field}
                value={field.value ?? ''}
              />
            </SettingRow>
          )}
        />
        <Controller
          control={form.control}
          name="s3.secretAccessKey"
          render={({ field, fieldState }) => (
            <SettingRow
              label="Secret Access Key"
              description="The IAM secret access key paired with the access key ID above."
              error={fieldState.error}
              layout="vertical"
            >
              <Input
                type="password"
                id="s3-secretAccessKey-input"
                {...field}
                value={field.value ?? ''}
              />
            </SettingRow>
          )}
        />
      </SettingSection>
    </>
  )
}
