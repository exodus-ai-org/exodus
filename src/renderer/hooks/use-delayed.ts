import { useEffect, useState } from 'react'

/**
 * `on`, but only once it has stayed on for `ms` (spec 2026-10-01 §D): a
 * loading indicator for what is quick on the LAN and slow over a tunnel
 * appears only when it is slow, so a fast load flashes nothing.
 */
export function useDelayed(on: boolean, ms = 300): boolean {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!on) {
      setShown(false)
      return
    }
    const timer = setTimeout(() => setShown(true), ms)
    return () => clearTimeout(timer)
  }, [on, ms])
  return on && shown
}
