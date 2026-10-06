import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useAtom } from 'jotai'
import { useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { openTabsAtom } from '@/stores/chat'

export function ChatTabs() {
  const [tabs, setTabs] = useAtom(openTabsAtom)
  const { id: activeId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const closeTab = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.preventDefault()
      e.stopPropagation()
      const tabIndex = tabs.findIndex((t) => t.id === tabId)
      const newTabs = tabs.filter((t) => t.id !== tabId)
      setTabs(newTabs)
      if (tabId === activeId) {
        if (newTabs.length > 0) {
          navigate(`/chat/${newTabs[Math.max(0, tabIndex - 1)].id}`)
        } else {
          navigate('/')
        }
      }
    },
    [tabs, setTabs, activeId, navigate]
  )

  if (tabs.length === 0) return null

  // Browser tabs on the header's bottom rule. The strip runs 1px past the
  // header (`-mb-px`) onto that rule: the open tab, the content's colour and
  // outlined on three sides, covers it there and reads as part of the page
  // below; the others sit quieter on the strip, a hairline between them.
  const activeIndex = tabs.findIndex((t) => t.id === activeId)
  return (
    <div className="-mb-px flex w-full [scrollbar-width:none] items-end overflow-x-auto overflow-y-hidden pl-2">
      {tabs.map((tab, i) => {
        const active = i === activeIndex
        const divided = i > 0 && !active && i - 1 !== activeIndex
        return (
          <Link
            key={tab.id}
            to={`/chat/${tab.id}`}
            aria-current={active ? 'page' : undefined}
            title={tab.title}
            className={cn(
              // no-drag: the strip is the window's drag region; a tab (and its
              // close button) must still take the click.
              'no-drag group relative flex h-9 max-w-48 min-w-0 shrink-0 items-center gap-1 rounded-t-lg border border-b-0 pr-1.5 pl-3 text-xs whitespace-nowrap transition-colors duration-150 ease-out',
              active
                ? 'bg-card text-foreground border-border z-10'
                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground border-transparent',
              divided &&
                'before:bg-border before:absolute before:top-1/2 before:left-0 before:h-4 before:w-px before:-translate-y-1/2 hover:before:opacity-0'
            )}
          >
            <span
              className={cn('min-w-0 flex-1 truncate', active && 'font-medium')}
            >
              {tab.title}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => closeTab(e, tab.id)}
              className={cn(
                'text-muted-foreground hover:text-foreground hover:bg-muted size-5 shrink-0 rounded-full transition-opacity focus-visible:opacity-100',
                active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} size={11} />
            </Button>
          </Link>
        )
      })}
    </div>
  )
}
