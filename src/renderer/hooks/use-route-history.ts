import { useAtom, useSetAtom } from 'jotai'
import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'

import {
  back,
  canGoBack,
  canGoForward,
  current,
  forward,
  pushed,
  type RouteHistory
} from '@/lib/route-history'
import { historyAtom } from '@/stores/history'

/**
 * Records every page the router shows into the history stack. Mounted once,
 * in the chat layout. A location change an arrow made (`skipNext`) has moved
 * the index already and is not pushed again. Settings and Philharmonic are
 * routes outside the layout: they are not recorded (Settings has its own
 * "Back to app"), and the stack resumes on return.
 */
export function useRouteHistoryRecorder() {
  const { pathname, key } = useLocation()
  const setHistory = useSetAtom(historyAtom)
  useEffect(() => {
    setHistory((history) =>
      history.skipNext
        ? { ...history, skipNext: false }
        : pushed(history, pathname)
    )
  }, [key, pathname, setHistory])
}

/**
 * The arrows: whether each can go, and going. An arrow navigates to the
 * entry's own path (not `navigate(-1)`): the browser's history is invisible
 * in Electron and the app's replace navigations would put the two out of
 * step; the stack is the one record.
 */
export function useRouteHistory() {
  const navigate = useNavigate()
  const [history, setHistory] = useAtom(historyAtom)
  const go = useCallback(
    (step: (state: RouteHistory) => RouteHistory) => {
      const next = step(history)
      if (next === history) return
      const path = current(next)
      if (path === undefined) return
      setHistory(next)
      navigate(path)
    },
    [history, navigate, setHistory]
  )
  const goBack = useCallback(() => go(back), [go])
  const goForward = useCallback(() => go(forward), [go])
  return {
    canGoBack: canGoBack(history),
    canGoForward: canGoForward(history),
    goBack,
    goForward
  }
}
