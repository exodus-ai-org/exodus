import {
  checkFullScreen,
  fullScreenChange,
  subscribeFullScreenChanged,
  unsubscribeFullScreenChanged
} from '@/lib/ipc'
import { IpcRendererEvent } from 'electron'
import { useEffect, useState } from 'react'

export function useIsFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    checkFullScreen().then(setIsFullscreen)
    fullScreenChange()

    const callback = (_: IpcRendererEvent, value: boolean) =>
      setIsFullscreen(value)
    subscribeFullScreenChanged(callback)

    return () => unsubscribeFullScreenChanged(callback)
  }, [])

  return isFullscreen
}
