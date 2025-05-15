import { WebSearchResult } from '@shared/types/web-search'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'

export function SourceItem({
  allWebSearchResults
}: {
  allWebSearchResults: WebSearchResult[]
}) {
  return (
    <div className="flex flex-col gap-2 whitespace-pre-wrap">
      {allWebSearchResults.map((item) => (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          key={item.link}
          className="hover:bg-accent flex flex-col gap-1 rounded-xl p-2"
        >
          <div className="flex w-full items-center gap-2">
            <Avatar className="size-6 border">
              <AvatarImage src={item.favicon} className="object-cover" />
              <AvatarFallback>{item.title?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="text-primary line-clamp-1 text-sm">
              {item.title}
            </div>
          </div>
          <div className="text-ring line-clamp-2 text-xs">{item.snippet}</div>
        </a>
      ))}
    </div>
  )
}
