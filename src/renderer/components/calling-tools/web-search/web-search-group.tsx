import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@/components/ui/hover-card'
import { WebSearchResult } from '@shared/types/web-search'
import { useState } from 'react'

export function WebSearchGroup({
  webSearchResults
}: {
  webSearchResults: WebSearchResult[]
  /** @deprecated variant is no longer used */
  variant?: string
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  return (
    <span className="*:ring-background flex -space-x-2 *:ring-3">
      {(webSearchResults ?? []).map((result, index) => {
        let origin = ''
        try {
          origin = new URL(result.link).origin
        } catch {
          return null
        }
        const favicon = `https://www.google.com/s2/favicons?domain=${origin}&sz=128`

        return (
          <HoverCard key={index}>
            <HoverCardTrigger>
              <a
                href={result.link}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <Avatar
                  className="border transition-transform"
                  style={{
                    transform:
                      activeIndex === index ? 'scale(1.1)' : 'scale(1)',
                    zIndex: activeIndex === index ? 10 : undefined
                  }}
                >
                  <AvatarImage src={favicon} alt={result.title} />
                  <AvatarFallback>{result.title.charAt(0)}</AvatarFallback>
                </Avatar>
              </a>
            </HoverCardTrigger>
            <HoverCardContent
              align="start"
              side="top"
              className="w-72 overflow-hidden rounded-xl border p-0 shadow-lg"
            >
              <a href={result.link} target="_blank" rel="noopener noreferrer">
                {result.ogImage && (
                  <img
                    src={result.ogImage}
                    alt={result.title}
                    loading="lazy"
                    className="h-32 w-full object-cover"
                  />
                )}
                <div className="space-y-1 p-3">
                  <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <img src={favicon} className="size-3" alt="" />
                    {new URL(result.link).hostname}
                  </div>
                  <div className="line-clamp-2 text-sm leading-snug font-semibold">
                    {result.title}
                  </div>
                  <div className="text-muted-foreground line-clamp-3 text-xs leading-relaxed">
                    {result.snippet}
                  </div>
                </div>
              </a>
            </HoverCardContent>
          </HoverCard>
        )
      })}
    </span>
  )
}
