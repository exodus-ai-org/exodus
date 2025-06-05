import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { WebSearchResult } from '@shared/types/web-search'

export function SourceItem({
  webSearchResults
}: {
  webSearchResults: WebSearchResult[]
}) {
  return (
    <div className="flex flex-col gap-1 whitespace-pre-wrap">
      {webSearchResults.map((item) => (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          key={item.link}
          className="hover:bg-sidebar-accent flex flex-col gap-0.5 rounded-xl p-2"
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
          <div className="text-sidebar-foreground/70 line-clamp-2 text-sm leading-snug font-normal">
            {item.snippet}
          </div>
        </a>
      ))}
    </div>
  )
}
