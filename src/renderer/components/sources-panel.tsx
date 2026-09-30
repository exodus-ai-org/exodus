import type { WebSearchResult } from '@exodus/shared/types/web-search'
import { useAtom } from 'jotai'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import removeMd from 'remove-markdown'

import { sourcesPanelAtom } from '@/stores/chat'

import { parseCitations } from './markdown-citations'
import { SheetPanel } from './sheet-panel'
import { SourceFavicon } from './source-favicon'
import { Separator } from './ui/separator'

function SourceLink({ item }: { item: WebSearchResult }) {
  let hostname = item.hostname ?? ''
  if (!hostname) {
    try {
      hostname = new URL(item.link).hostname
    } catch {
      hostname = item.link
    }
  }

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:bg-accent flex gap-3 rounded-lg px-3 py-2"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <SourceFavicon
            link={item.link}
            favicon={item.favicon}
            className="size-3.5"
          />
          <span className="truncate">{item.siteName || hostname}</span>
        </div>
        <div className="line-clamp-2 text-sm leading-snug font-semibold">
          {item.title}
        </div>

        {item.snippet && (
          <div className="text-muted-foreground line-clamp-2 text-xs leading-snug">
            {removeMd(item.snippet)}
          </div>
        )}
      </div>
    </a>
  )
}

export function SourcesPanel() {
  const { t } = useTranslation('chat')
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
          {t('sourcesPanel.title', { count: webSearchResults.length })}
        </h2>
      </div>

      {isOpen && (
        <div className="bg-background flex-1 overflow-y-auto p-3">
          {cited.length > 0 && (
            <>
              <p className="mb-2 px-3 text-xs font-semibold">
                {t('sourcesPanel.citations', { count: cited.length })}
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
              <p className="mb-2 px-3 text-xs font-semibold">
                {t('sourcesPanel.more')}
              </p>
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
