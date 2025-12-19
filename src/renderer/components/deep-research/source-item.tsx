import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { WebSearchResult } from '@shared/types/web-search'
import { useMemo } from 'react'
import { parseCitations } from '../markdown'
import { Separator } from '../ui/separator'

function SourceItemLink({ item }: { item: WebSearchResult }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:bg-sidebar-accent flex flex-col gap-0.5 rounded-xl px-3 py-2"
    >
      <div className="line-clamp-1 flex h-6 items-center gap-2 text-xs">
        <Avatar className="size-4">
          <AvatarImage
            src={`https://www.google.com/s2/favicons?domain=${new URL(item.link).origin}&sz=128`}
            alt={item.title}
            className="object-cover"
          />
          <AvatarFallback>{item.title?.charAt(0)}</AvatarFallback>
        </Avatar>
        {new URL(item.link).hostname}
      </div>
      <div className="line-clamp-2 text-sm font-semibold">{item.title}</div>
      <div className="text-muted-foreground line-clamp-2 text-sm leading-snug font-normal">
        {item.snippet}
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
  const citations = useMemo(
    () => [...new Set(parseCitations(finalReport))],
    [finalReport]
  )
  return (
    <div className="flex flex-col gap-1 whitespace-pre-wrap">
      <>
        {citations.length > 0 ? (
          <div>
            <p className="mb-0! ml-3 font-bold">Citations</p>
            {webSearchResults
              .filter((_, idx) => citations.includes(idx + 1))
              .map((item) => (
                <SourceItemLink key={item.link} item={item} />
              ))}
            <Separator className="mt-3" />
            <p className="mt-3 mb-0! ml-3 font-bold">More</p>
            {webSearchResults
              .filter((_, idx) => !citations.includes(idx + 1))
              .map((item) => (
                <SourceItemLink key={item.link} item={item} />
              ))}
          </div>
        ) : (
          webSearchResults.map((item) => (
            <SourceItemLink key={item.link} item={item} />
          ))
        )}
      </>
    </div>
  )
}
