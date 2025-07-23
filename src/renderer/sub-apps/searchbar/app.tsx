import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  closeSearchbar,
  findInPage,
  findNext,
  findPrevious,
  subscribeFindInPageResult
} from '@/lib/ipc'
import { cn } from '@/lib/utils'
import type { IpcRendererEvent, Result } from 'electron'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function FindBar() {
  const ref = useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = useState('')
  const [searchResult, setSearchResult] = useState<Result | null>(null)

  const handleChange = (query: string) => {
    setQuery(query.trim())
    findInPage(query.trim())

    if (!query.trim()) {
      setSearchResult(null)
    }
  }

  const handleClose = () => {
    setQuery('')
    closeSearchbar()
  }

  useEffect(() => {
    ref.current?.focus()
  }, [])

  useEffect(() => {
    return () => {
      subscribeFindInPageResult((_: IpcRendererEvent, result: Result) => {
        if (result.finalUpdate) {
          setSearchResult(result)
        }
      })
    }
  }, [])

  // Unload Find-in-Page when pressing Esc
  // The listener should be mounted in both main window and searchbar view
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div
      className={cn(
        'bg-background fixed top-4 right-4 z-50 flex w-[24.125rem] items-center gap-2 rounded-2xl border p-2 shadow-md'
      )}
    >
      <Input
        ref={ref}
        className="border-none text-sm shadow-none focus-visible:ring-0"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
      />
      {searchResult ? (
        <div className="text-ring text-xs">
          {searchResult.activeMatchOrdinal}/{searchResult.matches}
        </div>
      ) : null}

      <Separator orientation="vertical" className="!h-6" />

      <div className="flex gap-1">
        <Button
          variant="ghost"
          onClick={() => {
            findPrevious(query.trim())
          }}
          title="Previous match"
          className="h-7 w-7 rounded-full"
          disabled={!searchResult || searchResult.matches === 0}
        >
          <ChevronUp />
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            findNext(query.trim())
          }}
          title="Next match"
          className="h-7 w-7 rounded-full"
          disabled={!searchResult || searchResult.matches === 0}
        >
          <ChevronDown />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={handleClose}
          title="Close"
          className="h-7 w-7 rounded-full"
        >
          <X />
        </Button>
      </div>
    </div>
  )
}
