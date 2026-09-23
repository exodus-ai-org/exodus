import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import { useHotkeys } from '@tanstack/react-hotkeys'
import type { IpcRendererEvent, Result } from 'electron'
import { ChevronDownIcon, ChevronUpIcon, SearchIcon, XIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText
} from '@/components/ui/input-group'
import {
  closeSearchbar,
  findInPage,
  findNext,
  findPrevious,
  subscribeFindInPageResult,
  subscribeFocusSearchBar,
  unsubscribeFindInPageResult,
  unsubscribeFocusSearchBar
} from '@/lib/ipc'
import { cn } from '@/lib/utils'

/**
 * The find bar. It lives in a view of its own (window.ts) rather than in the
 * main page because `findInPage` searches the page it runs on — a bar rendered
 * there would find its own input and its own match counter.
 */
export function SearchBar() {
  const { t } = useTranslation('chat')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const trimmed = query.trim()

  const handleChange = (value: string) => {
    setQuery(value)
    const next = value.trim()
    if (next) {
      void findInPage(next)
    } else {
      setResult(null)
      // An empty query is the main process's cue to clear the highlights.
      void findInPage('')
    }
  }

  const goNext = () => {
    if (trimmed) void findNext(trimmed)
  }
  const goPrevious = () => {
    if (trimmed) void findPrevious(trimmed)
  }

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // The main process re-summons the bar: a fresh open starts empty, pressing
  // Cmd+F while it is already open just selects the query again.
  useEffect(() => {
    const onFocus = (_: IpcRendererEvent, fresh: boolean) => {
      if (fresh) {
        setQuery('')
        setResult(null)
      }
      inputRef.current?.focus()
      inputRef.current?.select()
    }
    subscribeFocusSearchBar(onFocus)
    return () => unsubscribeFocusSearchBar(onFocus)
  }, [])

  useEffect(() => {
    const onResult = (_: IpcRendererEvent, next: Result) => {
      if (next.finalUpdate) setResult(next)
    }
    subscribeFindInPageResult(onResult)
    return () => unsubscribeFindInPageResult(onResult)
  }, [])

  // Enter inside the input is the point, so inputs are not skipped; a key that
  // is committing an IME composition is not a "next match".
  useHotkeys(
    [
      { hotkey: 'Escape', callback: () => void closeSearchbar() },
      {
        hotkey: 'Enter',
        callback: (event) => {
          if (!event.isComposing) goNext()
        }
      },
      {
        hotkey: 'Shift+Enter',
        callback: (event) => {
          if (!event.isComposing) goPrevious()
        }
      }
    ],
    { ignoreInputs: false }
  )

  const hasMatches = result !== null && result.matches > 0
  const noMatches = result !== null && result.matches === 0

  return (
    <div className="flex h-screen items-center justify-center px-4">
      <div className="bg-popover text-popover-foreground border-border/60 flex w-full items-center gap-1 rounded-3xl border p-1.5 shadow-md">
        <InputGroup className="flex-1">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            ref={inputRef}
            data-testid={TEST_IDS.findInPage.input}
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={t('findInPage.placeholder')}
            aria-label={t('findInPage.placeholder')}
            autoComplete="off"
            spellCheck={false}
          />
          {trimmed && result && (
            <InputGroupAddon align="inline-end">
              <InputGroupText
                className={cn(
                  'text-xs whitespace-nowrap tabular-nums',
                  noMatches && 'text-destructive'
                )}
              >
                {noMatches
                  ? t('findInPage.noResults')
                  : `${result.activeMatchOrdinal}/${result.matches}`}
              </InputGroupText>
            </InputGroupAddon>
          )}
        </InputGroup>

        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-full"
          data-testid={TEST_IDS.findInPage.previousButton}
          onClick={goPrevious}
          disabled={!hasMatches}
          title={t('findInPage.previous')}
          aria-label={t('findInPage.previous')}
        >
          <ChevronUpIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-full"
          data-testid={TEST_IDS.findInPage.nextButton}
          onClick={goNext}
          disabled={!hasMatches}
          title={t('findInPage.next')}
          aria-label={t('findInPage.next')}
        >
          <ChevronDownIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-full"
          data-testid={TEST_IDS.findInPage.closeButton}
          onClick={() => void closeSearchbar()}
          title={t('findInPage.close')}
          aria-label={t('findInPage.close')}
        >
          <XIcon />
        </Button>
      </div>
    </div>
  )
}
