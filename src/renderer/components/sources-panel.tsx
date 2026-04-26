import { faviconUrl } from '@shared/constants/external-urls'
import type { WebSearchResult } from '@shared/types/web-search'
import { useAtom } from 'jotai'
import { useMemo } from 'react'

import { sourcesPanelAtom } from '@/stores/chat'

import { parseCitations } from './markdown'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Separator } from './ui/separator'
import { SheetPanel } from './ui/sheet'

function SourceLink({ item }: { item: WebSearchResult }) {
  let hostname = ''
  let favicon = ''
  try {
    const url = new URL(item.link)
    hostname = url.hostname
    favicon = faviconUrl(url.origin)
  } catch {
    hostname = item.link
  }

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:bg-accent flex gap-3 rounded-lg px-3 py-2"
    >
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-sm leading-snug font-semibold">
          {item.title}
        </div>
        <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
          {favicon && (
            <Avatar className="size-3.5">
              <AvatarImage src={favicon} alt={hostname} />
              <AvatarFallback>{item.title?.charAt(0)}</AvatarFallback>
            </Avatar>
          )}
          <span className="truncate">{hostname}</span>
        </div>
        {item.snippet && (
          <div className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-snug">
            {item.snippet}
          </div>
        )}
      </div>
    </a>
  )
}

export function SourcesPanel() {
  const [sourcesData, setSourcesData] = useAtom(sourcesPanelAtom)
  const isOpen = sourcesData !== null

  const citedRanks = useMemo(
    () => new Set(parseCitations(sourcesData?.messageText ?? '') ?? []),
    [sourcesData?.messageText]
  )

  const webSearchResults = sourcesData?.webSearchResults ?? []
  const cited = webSearchResults.filter((r) => citedRanks.has(r.rank))
  const more = webSearchResults.filter((r) => !citedRanks.has(r.rank))

  return (
    <SheetPanel open={isOpen} onClose={() => setSourcesData(null)} className="">
      <div className="bg-background sticky top-0 z-10 flex h-12 shrink-0 items-center border-b px-4">
        <h2 className="text-sm font-semibold">
          {webSearchResults.length} Sources
        </h2>
      </div>

      {isOpen && (
        <div className="bg-background flex-1 overflow-y-auto p-3">
          {cited.length > 0 && (
            <>
              <p className="mb-2 px-3 text-xs font-semibold">
                Citations ({cited.length})
              </p>
              <div className="flex flex-col gap-0.5">
                {cited.map((item) => (
                  <SourceLink key={item.link} item={item} />
                ))}
              </div>
            </>
          )}
          {more.length > 0 && (
            <>
              {cited.length > 0 && <Separator className="my-3" />}
              <p className="mb-2 px-3 text-xs font-semibold">More</p>
              <div className="flex flex-col gap-0.5">
                {more.map((item) => (
                  <SourceLink key={item.link} item={item} />
                ))}
              </div>
            </>
          )}
          {cited.length === 0 && more.length === 0 && (
            <div className="flex flex-col gap-0.5">
              {webSearchResults.map((item) => (
                <SourceLink key={item.link} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </SheetPanel>
  )
}
