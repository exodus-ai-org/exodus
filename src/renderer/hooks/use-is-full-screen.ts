import {
  checkFullScreen,
  fullScreenChange,
  subscribeFullScreenChanged
} from '@/lib/ipc'
import { useEffect, useState } from 'react'

export function useIsFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const initialScreenStatus = async () => {
    const isFullscreen: boolean = await checkFullScreen()
    setIsFullscreen(isFullscreen)
  }

  useEffect(() => {
    initialScreenStatus()
    fullScreenChange()

    return () =>
      subscribeFullScreenChanged((_, isFullscreen) =>
        setIsFullscreen(isFullscreen)
      )
  }, [])

  return isFullscreen
}
