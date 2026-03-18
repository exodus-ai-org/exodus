import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { WebSearchResult } from '@shared/types/web-search'
import { useMemo } from 'react'
import { parseCitations } from '../markdown'

function SourceItemLink({ item }: { item: WebSearchResult }) {
  let hostname = ''
  try {
    hostname = new URL(item.link).hostname
  } catch {
    hostname = item.link
  }
  const favicon = `https://www.google.com/s2/favicons?domain=${new URL(item.link).origin}&sz=128`

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:bg-sidebar-accent flex gap-3 rounded-xl px-3 py-2"
    >
      {item.ogImage ? (
        <img
          src={item.ogImage}
          alt={item.title}
          loading="lazy"
          className="mt-0.5 h-12 w-20 flex-shrink-0 rounded-md object-cover"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-sm leading-snug font-semibold">
          {item.title}
        </div>
        <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
          <Avatar className="size-3.5">
            <AvatarImage
              src={favicon}
              alt={hostname}
              className="object-cover"
            />
            <AvatarFallback>{item.title?.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="truncate">{hostname}</span>
        </div>
        {item.snippet ? (
          <div className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-snug">
            {item.snippet}
          </div>
        ) : null}
      </div>
    </a>
  )
}

export function SourceItem({
  webSearchResults,
  finalReport
}: {
  finalReport?: string
  webSearchResults: WebSearchResult[]
}) {
  const citedRanks = useMemo(() => {
    if (!finalReport) return new Set<number>()
    return new Set(parseCitations(finalReport) ?? [])
  }, [finalReport])

  const cited = webSearchResults.filter((r) => citedRanks.has(r.rank))
  const more = webSearchResults.filter((r) => !citedRanks.has(r.rank))

  if (citedRanks.size === 0) {
    return (
      <div className="flex flex-col gap-1">
        {webSearchResults.map((item) => (
          <SourceItemLink key={item.link} item={item} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="mb-0! ml-3 font-bold">Citations</p>
      {cited.map((item) => (
        <SourceItemLink key={item.link} item={item} />
      ))}
      {more.length > 0 && (
        <>
          <Separator className="mt-3" />
          <p className="mt-3 mb-0! ml-3 font-bold">More</p>
          {more.map((item) => (
            <SourceItemLink key={item.link} item={item} />
          ))}
        </>
      )}
    </div>
  )
}
