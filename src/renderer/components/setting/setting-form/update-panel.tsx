import { Button } from '@/components/ui/button'
import { UpdaterPayload } from '@/hooks/use-updater'
import { updaterCheck, updaterDownload, updaterInstall } from '@/lib/ipc'
import {
  AlertCircleIcon,
  CheckCircleIcon,
  DownloadIcon,
  LoaderIcon,
  RefreshCwIcon,
  ZapIcon
} from 'lucide-react'

interface UpdatePanelProps {
  payload: UpdaterPayload
  autoUpdate: boolean
}

export function UpdatePanel({ payload, autoUpdate }: UpdatePanelProps) {
  const { state, availableVersion, downloadProgress, errorMessage } = payload

  if (state === 'idle') {
    return (
      <div className="bg-muted/40 flex items-center justify-between rounded-lg px-4 py-3">
        <span className="text-muted-foreground text-sm">
          Check for the latest version
        </span>
        <Button variant="outline" size="sm" onClick={() => updaterCheck()}>
          <RefreshCwIcon className="mr-1.5 h-3.5 w-3.5" />
          Check for Updates
        </Button>
      </div>
    )
  }

  if (state === 'checking') {
    return (
      <div className="bg-muted/40 flex items-center gap-3 rounded-lg px-4 py-3">
        <LoaderIcon className="text-muted-foreground h-4 w-4 animate-spin" />
        <span className="text-muted-foreground text-sm">
          Checking for updates…
        </span>
      </div>
    )
  }

  if (state === 'up-to-date') {
    return (
      <div className="bg-muted/40 flex items-center justify-between rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="h-4 w-4 text-green-500" />
          <span className="text-sm">You're on the latest version</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => updaterCheck()}>
          <RefreshCwIcon className="mr-1.5 h-3.5 w-3.5" />
          Check again
        </Button>
      </div>
    )
  }

  if (state === 'available') {
    return (
      <div className="bg-muted/40 flex items-center justify-between rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <ZapIcon className="h-4 w-4 text-blue-500" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Update available</span>
            {availableVersion && (
              <span className="text-muted-foreground text-xs">
                Version {availableVersion}
              </span>
            )}
          </div>
        </div>
        {!autoUpdate && (
          <Button size="sm" onClick={() => updaterDownload()}>
            <DownloadIcon className="mr-1.5 h-3.5 w-3.5" />
            Download
          </Button>
        )}
      </div>
    )
  }

  if (state === 'downloading') {
    return (
      <div className="bg-muted/40 flex flex-col gap-2 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DownloadIcon className="text-muted-foreground h-4 w-4" />
            <span className="text-sm">Downloading update…</span>
          </div>
          <span className="text-muted-foreground text-xs">
            {downloadProgress}%
          </span>
        </div>
        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all duration-300"
            style={{ width: `${downloadProgress}%` }}
          />
        </div>
      </div>
    )
  }

  if (state === 'ready') {
    return (
      <div className="bg-muted/40 flex items-center justify-between rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="h-4 w-4 text-green-500" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Update ready to install</span>
            <span className="text-muted-foreground text-xs">
              Restart to apply the update
            </span>
          </div>
        </div>
        <Button size="sm" onClick={() => updaterInstall()}>
          Restart & Install
        </Button>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="bg-muted/40 flex items-center justify-between rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <AlertCircleIcon className="text-destructive h-4 w-4" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Update failed</span>
            {errorMessage && (
              <span className="text-muted-foreground max-w-xs truncate text-xs">
                {errorMessage}
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => updaterCheck()}>
          <RefreshCwIcon className="mr-1.5 h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    )
  }

  return null
}
