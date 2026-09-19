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
      className="text-ring inline-flex items-center gap-1 text-sm hover:underline"
    >
      {children}
      <ExternalLinkIcon size={12} />
    </a>
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
    <SettingsSection>
      <SettingsRow label={t('about.version')}>
        <span className="text-ring text-sm">v{version}</span>
      </SettingsRow>
      <SettingsRow label={t('about.electron')}>
        <span className="text-ring text-sm">v{versions.electron}</span>
      </SettingsRow>
      <SettingsRow label={t('about.chromium')}>
        <span className="text-ring text-sm">v{versions.chrome}</span>
      </SettingsRow>
      <SettingsRow label={t('about.node')}>
        <span className="text-ring text-sm">v{versions.node}</span>
      </SettingsRow>
      <SettingsRow label={t('about.v8')}>
        <span className="text-ring text-sm">v{versions.v8}</span>
      </SettingsRow>
      <SettingsRow label={t('about.os')}>
        <span className="text-ring text-sm">{os}</span>
      </SettingsRow>

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
        <span className="text-ring text-sm">MIT</span>
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
  )
}
