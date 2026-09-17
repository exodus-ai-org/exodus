import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { AlertCircleIcon } from 'lucide-react'
import { Controller } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'

import { SettingsRow, SettingsSection } from '../settings-row'

export function S3({ form }: { form: UseFormReturnType }) {
  const { t } = useTranslation('settings')

  return (
    <>
      <Alert className="mb-4">
        <AlertCircleIcon className="size-4" data-icon />
        <AlertDescription className="flex flex-col gap-2 text-sm">
          <p>
            <Trans ns="settings" i18nKey="tools.s3.alert.encoding">
              By default, Exodus encodes attachments as <strong>base64</strong>{' '}
              inline in the prompt. For large files or vision-heavy workflows,
              uploading to S3 and passing a URL is more efficient and reliable.
            </Trans>
          </p>
          <p>
            <Trans ns="settings" i18nKey="tools.s3.alert.requirementsHeading">
              <strong>Requirements before configuring:</strong>
            </Trans>
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-4">
            <li>
              <Trans ns="settings" i18nKey="tools.s3.alert.publicReadAccess">
                <strong>Public read access</strong> — AWS blocks public access
                by default. You must disable "Block all public access" on the
                bucket and attach a bucket policy granting{' '}
                <code>s3:GetObject</code> to <code>*</code>, so the AI provider
                can fetch the URL without credentials.
              </Trans>
            </li>
            <li>
              <Trans ns="settings" i18nKey="tools.s3.alert.cors">
                <strong>CORS</strong> — Add a CORS rule allowing{' '}
                <code>PUT</code> from <code>*</code> (or your app origin) so
                Exodus can upload directly from the desktop.
              </Trans>
            </li>
            <li>
              <Trans ns="settings" i18nKey="tools.s3.alert.iamCredentials">
                <strong>IAM credentials</strong> — The Access Key ID / Secret
                Access Key must belong to an IAM user or role with at least{' '}
                <code>s3:PutObject</code> and <code>s3:PutObjectAcl</code>{' '}
                permissions on the configured bucket.
              </Trans>
            </li>
            <li>
              <Trans ns="settings" i18nKey="tools.s3.alert.objectAcl">
                <strong>Object ACL</strong> — Each uploaded object is set to{' '}
                <code>public-read</code>. Your bucket must not have ACLs
                disabled (i.e., Object Ownership must be set to{' '}
                <em>ACLs enabled / Bucket owner preferred</em>).
              </Trans>
            </li>
          </ul>
        </AlertDescription>
      </Alert>
      <SettingsSection>
        <Controller
          control={form.control}
          name="s3.region"
          render={({ field, fieldState }) => (
            <SettingsRow
              label={t('tools.s3.region.label')}
              description={t('tools.s3.region.description')}
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
            </SettingsRow>
          )}
        />
        <Controller
          control={form.control}
          name="s3.bucket"
          render={({ field, fieldState }) => (
            <SettingsRow
              label={t('tools.s3.bucket.label')}
              description={t('tools.s3.bucket.description')}
              error={fieldState.error}
              layout="vertical"
            >
              <Input
                type="input"
                id="s3-bucket-input"
                placeholder={t('tools.s3.bucket.placeholder')}
                {...field}
                value={field.value ?? ''}
              />
            </SettingsRow>
          )}
        />
        <Controller
          control={form.control}
          name="s3.accessKeyId"
          render={({ field, fieldState }) => (
            <SettingsRow
              label={t('tools.s3.accessKeyId.label')}
              description={t('tools.s3.accessKeyId.description')}
              error={fieldState.error}
              layout="vertical"
            >
              <Input
                type="input"
                id="s3-accessKeyId-input"
                {...field}
                value={field.value ?? ''}
              />
            </SettingsRow>
          )}
        />
        <Controller
          control={form.control}
          name="s3.secretAccessKey"
          render={({ field, fieldState }) => (
            <SettingsRow
              label={t('tools.s3.secretAccessKey.label')}
              description={t('tools.s3.secretAccessKey.description')}
              error={fieldState.error}
              layout="vertical"
            >
              <Input
                type="password"
                id="s3-secretAccessKey-input"
                {...field}
                value={field.value ?? ''}
              />
            </SettingsRow>
          )}
        />
      </SettingsSection>
    </>
  )
}
