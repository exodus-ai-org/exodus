import { useEffect, useState } from 'react'

export function useIsFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const initialScreenStatus = async () => {
    const isFullscreen: boolean =
      await window.electron.ipcRenderer.invoke('check-fullscreen')
    setIsFullscreen(isFullscreen)
  }

  useEffect(() => {
    initialScreenStatus()

    window.electron.ipcRenderer.invoke('subscribe-fullscreen-change')
    const removeListener = window.electron.ipcRenderer.on(
      'fullscreen-changed',
      (_, isFullscreen) => {
        setIsFullscreen(isFullscreen)
      }
    )

    return () => removeListener()
  }, [])

  return isFullscreen
}
