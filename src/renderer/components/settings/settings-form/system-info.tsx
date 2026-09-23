import {
  EXODUS_REPO,
  EXODUS_TWITTER,
  EXODUS_WEBSITE
} from '@exodus/shared/constants/external-urls'
import { UseFormReturnType } from '@exodus/shared/schemas/settings-schema'
import { ExternalLinkIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { Switch } from '@/components/ui/switch'
import { useUpdater } from '@/hooks/use-updater'
import { updaterSetAutoDownload } from '@/lib/ipc'

import { version } from '../../../../../package.json'
import { SettingsRow, SettingsSection } from '../settings-row'
import { UpdatePanel } from './update-panel'

function ExternalLink({
  href,
  children
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm underline-offset-4 transition-colors hover:underline"
    >
      {children}
      <ExternalLinkIcon size={12} />
    </a>
  )
}

/** A read-only fact on the right of a row — versions line up in mono digits. */
function Value({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground font-mono text-sm tabular-nums">
      {children}
    </span>
  )
}

export function SystemInfo({ form }: { form: UseFormReturnType }) {
  const { t } = useTranslation('settings')
  const { versions } = window.electron.process
  const { os } = window.api
  const { payload } = useUpdater()
  const autoUpdate = form.watch('autoUpdate') ?? true

  useEffect(() => {
    updaterSetAutoDownload(autoUpdate)
  }, [autoUpdate])

  return (
    <>
      {/* What people come here for first: which version, and is there a newer one. */}
      <SettingsSection>
        <SettingsRow label={t('about.version')}>
          <Value>v{version}</Value>
        </SettingsRow>
        <SettingsRow
          label={t('about.autoUpdate.label')}
          description={t('about.autoUpdate.description')}
        >
          <Switch
            checked={autoUpdate}
            onCheckedChange={(checked) => form.setValue('autoUpdate', checked)}
          />
        </SettingsRow>
        <UpdatePanel payload={payload} autoUpdate={autoUpdate} />
      </SettingsSection>

      <SettingsSection title={t('about.sections.runtime')}>
        <SettingsRow label={t('about.electron')}>
          <Value>v{versions.electron}</Value>
        </SettingsRow>
        <SettingsRow label={t('about.chromium')}>
          <Value>v{versions.chrome}</Value>
        </SettingsRow>
        <SettingsRow label={t('about.node')}>
          <Value>v{versions.node}</Value>
        </SettingsRow>
        <SettingsRow label={t('about.v8')}>
          <Value>v{versions.v8}</Value>
        </SettingsRow>
        <SettingsRow label={t('about.os')}>
          <Value>{os}</Value>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title={t('about.sections.links')}>
        <SettingsRow label={t('about.github')}>
          <ExternalLink href={EXODUS_REPO}>exodus-ai-org/exodus</ExternalLink>
        </SettingsRow>
        <SettingsRow label={t('about.twitter')}>
          <ExternalLink href={EXODUS_TWITTER}>@YanceyOfficial</ExternalLink>
        </SettingsRow>
        <SettingsRow label={t('about.website')}>
          <ExternalLink href={EXODUS_WEBSITE}>exodus.yancey.app</ExternalLink>
        </SettingsRow>
        <SettingsRow label={t('about.license')}>
          <Value>MIT</Value>
        </SettingsRow>
      </SettingsSection>
    </>
  )
}
