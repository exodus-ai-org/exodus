import {
  AlertCircleIcon,
  CheckCircleIcon,
  DownloadIcon,
  LoaderIcon,
  RefreshCwIcon,
  ZapIcon
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { UpdaterPayload } from '@/hooks/use-updater'
import { updaterCheck, updaterDownload, updaterInstall } from '@/lib/ipc'

interface UpdatePanelProps {
  payload: UpdaterPayload
  autoUpdate: boolean
}

export function UpdatePanel({ payload, autoUpdate }: UpdatePanelProps) {
  const { t } = useTranslation(['common', 'settings'])
  const { state, availableVersion, downloadProgress, errorMessage, mode } =
    payload

  if (state === 'idle') {
    return (
      <div className="flex items-center justify-between rounded-lg px-4 py-3">
        <span className="text-muted-foreground text-sm">
          {t('settings:about.update.checkPrompt')}
        </span>
        <Button variant="outline" size="sm" onClick={() => updaterCheck()}>
          <RefreshCwIcon className="mr-1.5 size-3.5" data-icon />
          {t('settings:about.update.checkButton')}
        </Button>
      </div>
    )
  }

  if (state === 'checking') {
    return (
      <div className="flex items-center gap-3 rounded-lg px-4 py-3">
        <LoaderIcon className="text-muted-foreground size-4 animate-spin" />
        <span className="text-muted-foreground text-sm">
          {t('settings:about.update.checking')}
        </span>
      </div>
    )
  }

  if (state === 'up-to-date') {
    return (
      <div className="flex items-center justify-between rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="size-4 text-green-500" />
          <span className="text-sm">{t('settings:about.update.upToDate')}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => updaterCheck()}>
          <RefreshCwIcon className="mr-1.5 size-3.5" data-icon />
          {t('settings:about.update.checkAgain')}
        </Button>
      </div>
    )
  }

  if (state === 'available') {
    // A build that can't update itself always needs the button: the page is
    // the only way to get the new version.
    const manual = mode === 'manual'
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <ZapIcon className="size-4 shrink-0 text-blue-500" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {t('settings:about.update.available')}
            </span>
            {availableVersion && (
              <span className="text-muted-foreground text-xs">
                {t('settings:about.update.availableVersion', {
                  version: availableVersion
                })}
              </span>
            )}
            {manual && (
              <span className="text-muted-foreground max-w-sm text-xs">
                {t('settings:about.update.manualHint')}
              </span>
            )}
          </div>
        </div>
        {(manual || !autoUpdate) && (
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => updaterDownload()}
          >
            <DownloadIcon className="mr-1.5 size-3.5" data-icon />
            {manual
              ? t('settings:about.update.downloadPage')
              : t('settings:about.update.download')}
          </Button>
        )}
      </div>
    )
  }

  if (state === 'downloading') {
    return (
      <div className="flex flex-col gap-2 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DownloadIcon className="text-muted-foreground size-4" />
            <span className="text-sm">
              {t('settings:about.update.downloading')}
            </span>
          </div>
          <span className="text-muted-foreground text-xs">
            {downloadProgress}%
          </span>
        </div>
        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-300"
            style={{ width: `${downloadProgress}%` }}
          />
        </div>
      </div>
    )
  }

  if (state === 'ready') {
    return (
      <div className="flex items-center justify-between rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="size-4 text-green-500" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {t('settings:about.update.ready')}
            </span>
            <span className="text-muted-foreground text-xs">
              {t('settings:about.update.readyDescription')}
            </span>
          </div>
        </div>
        <Button size="sm" onClick={() => updaterInstall()}>
          {t('settings:about.update.restartAndInstall')}
        </Button>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex items-center justify-between rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <AlertCircleIcon className="text-destructive size-4" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {t('settings:about.update.failed')}
            </span>
            {errorMessage && (
              <span className="text-muted-foreground max-w-xs truncate text-xs">
                {errorMessage}
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => updaterCheck()}>
          <RefreshCwIcon className="mr-1.5 size-3.5" data-icon />
          {t('action.retry')}
        </Button>
      </div>
    )
  }

  return null
}
