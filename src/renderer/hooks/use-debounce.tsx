import { debounce } from 'lodash-es'
import { useEffect, useMemo, useState } from 'react'

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  const debouncedSet = useMemo(
    () => debounce(setDebouncedValue, delay),
    [delay]
  )

  useEffect(() => {
    debouncedSet(value)
    return () => {
      debouncedSet.cancel()
    }
  }, [value, debouncedSet])

  return debouncedValue
}
