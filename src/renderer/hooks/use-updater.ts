import { IpcRendererEvent } from 'electron'
import { useEffect, useState } from 'react'

import {
  subscribeUpdaterStateChanged,
  unsubscribeUpdaterStateChanged,
  updaterCheck,
  updaterDownload,
  updaterGetState,
  updaterInstall,
  updaterSetAutoDownload
} from '@/lib/ipc'

export type UpdaterState =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error'

export interface UpdaterPayload {
  state: UpdaterState
  availableVersion: string | null
  downloadProgress: number
  errorMessage: string | null
}

const defaultPayload: UpdaterPayload = {
  state: 'idle',
  availableVersion: null,
  downloadProgress: 0,
  errorMessage: null
}

export function useUpdater() {
  const [payload, setPayload] = useState<UpdaterPayload>(defaultPayload)

  useEffect(() => {
    updaterGetState().then((p) => {
      if (p) setPayload(p as UpdaterPayload)
    })

    const callback = (_: IpcRendererEvent, p: unknown) => {
      setPayload(p as UpdaterPayload)
    }

    subscribeUpdaterStateChanged(callback)
    return () => unsubscribeUpdaterStateChanged(callback)
  }, [])

  return {
    payload,
    check: updaterCheck,
    download: updaterDownload,
    install: updaterInstall,
    setAutoDownload: updaterSetAutoDownload
  }
}
