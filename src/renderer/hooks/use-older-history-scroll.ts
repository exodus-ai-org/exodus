import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef
} from 'react'

/** How near the top a scroll starts loading the page before. */
const LOAD_OLDER_THRESHOLD = 600

/**
 * The transcript's side of older history (spec 2026-10-01 §C4): scrolling
 * near the top loads the page before (`useOlderPages().loadOlder`), and so
 * does a first page shorter than the window, which cannot be scrolled. The
 * page goes in above what is being read, so the scroll position moves down
 * by exactly what was added and the reader stays where they were — the
 * container sets `overflow-anchor: none`, or the browser's own anchoring
 * would move it a second time.
 */
export function useOlderHistoryScroll(
  ref: RefObject<HTMLElement | null>,
  {
    firstId,
    hasOlder,
    loadingOlder,
    loadOlder
  }: {
    /** The first message shown: it changes when a page goes in above. */
    firstId: string | undefined
    hasOlder: boolean
    loadingOlder: boolean
    loadOlder?: (through?: string) => Promise<void>
  }
) {
  const anchor = useRef<{ height: number; top: number } | null>(null)

  /** Loads the page before — or back through a run — keeping the place. */
  const requestOlder = useCallback(
    (through?: string) => {
      const $el = ref.current
      if (!$el || !loadOlder) return Promise.resolve()
      anchor.current = { height: $el.scrollHeight, top: $el.scrollTop }
      return loadOlder(through)
    },
    [ref, loadOlder]
  )

  useLayoutEffect(() => {
    const $el = ref.current
    const saved = anchor.current
    if (!$el || !saved) return
    anchor.current = null
    $el.scrollTop = saved.top + ($el.scrollHeight - saved.height)
  }, [ref, firstId])

  useEffect(() => {
    const $el = ref.current
    if (!$el || !hasOlder || loadingOlder) return
    if ($el.scrollHeight <= $el.clientHeight) void requestOlder()
  }, [ref, hasOlder, loadingOlder, firstId, requestOlder])

  /** For the container's scroll handler. */
  const nearTop = useCallback(() => {
    const $el = ref.current
    if (!$el || !hasOlder || loadingOlder) return
    if ($el.scrollTop < LOAD_OLDER_THRESHOLD) void requestOlder()
  }, [ref, hasOlder, loadingOlder, requestOlder])

  return { requestOlder, nearTop }
}
