import type { IpcRendererEvent, Result } from 'electron'
import { ChevronDownIcon, ChevronUpIcon, XIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  closeSearchbar,
  findInPage,
  findNext,
  findPrevious,
  subscribeFindInPageResult,
  unsubscribeFindInPageResult
} from '@/lib/ipc'

export function SearchBar() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = useState('')
  const [searchResult, setSearchResult] = useState<Result | null>(null)

  const handleChange = useCallback((value: string) => {
    setQuery(value)
    const trimmed = value.trim()
    if (trimmed) {
      findInPage(trimmed)
    } else {
      setSearchResult(null)
    }
  }, [])

  const handleClose = useCallback(() => {
    setQuery('')
    setSearchResult(null)
    closeSearchbar()
  }, [])

  const handlePrevious = useCallback(() => {
    const trimmed = query.trim()
    if (trimmed) findPrevious(trimmed)
  }, [query])

  const handleNext = useCallback(() => {
    const trimmed = query.trim()
    if (trimmed) findNext(trimmed)
  }, [query])

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Subscribe to find-in-page results from main process
  useEffect(() => {
    const handler = (_: IpcRendererEvent, result: Result) => {
      if (result.finalUpdate) {
        setSearchResult(result)
      }
    }

    subscribeFindInPageResult(handler)
    return () => unsubscribeFindInPageResult(handler)
  }, [])

  // Close on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) {
          handlePrevious()
        } else {
          handleNext()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleClose, handleNext, handlePrevious])

  const hasMatches = searchResult && searchResult.matches > 0
  const noMatches = searchResult && searchResult.matches === 0

  return (
    <div className="bg-background fixed top-4 right-4 z-50 flex w-96.5 items-center gap-2 rounded-2xl border p-2 shadow-md">
      <Input
        ref={inputRef}
        className="border-none text-sm shadow-none focus-visible:ring-0"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Find in page..."
      />
      {searchResult && (
        <div
          className={
            noMatches
              ? 'text-destructive text-xs whitespace-nowrap'
              : 'text-ring text-xs whitespace-nowrap'
          }
        >
          {searchResult.activeMatchOrdinal}/{searchResult.matches}
        </div>
      )}

      <Separator orientation="vertical" className="h-6!" />

      <div className="flex gap-1">
        <Button
          variant="ghost"
          onClick={handlePrevious}
          title="Previous match (Shift+Enter)"
          className="size-7 rounded-full"
          disabled={!hasMatches}
        >
          <ChevronUpIcon data-icon />
        </Button>
        <Button
          variant="ghost"
          onClick={handleNext}
          title="Next match (Enter)"
          className="size-7 rounded-full"
          disabled={!hasMatches}
        >
          <ChevronDownIcon data-icon />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={handleClose}
          title="Close (Esc)"
          className="size-7 rounded-full"
          tabIndex={-1}
        >
          <XIcon data-icon />
        </Button>
      </div>
    </div>
  )
}
