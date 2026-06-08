import { useAtom } from 'jotai'
import { useCallback, useEffect } from 'react'

import { getLockStatus, onLockStateChanged, pingActivity } from '@/lib/lock-ipc'
import { lockStatusAtom } from '@/stores/lock'

const ACTIVITY_THROTTLE_MS = 5000

export function useLock() {
  const [status, setStatus] = useAtom(lockStatusAtom)

  const refresh = useCallback(async () => {
    setStatus(await getLockStatus())
  }, [setStatus])

  useEffect(() => {
    refresh()
    return onLockStateChanged(refresh)
  }, [refresh])

  useEffect(() => {
    let last = 0
    const onActivity = () => {
      const now = Date.now()
      if (now - last < ACTIVITY_THROTTLE_MS) return
      last = now
      pingActivity()
    }
    window.addEventListener('mousemove', onActivity)
    window.addEventListener('keydown', onActivity)
    window.addEventListener('mousedown', onActivity)
    return () => {
      window.removeEventListener('mousemove', onActivity)
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('mousedown', onActivity)
    }
  }, [])

  return { status, refresh, locked: status?.locked ?? false }
}
