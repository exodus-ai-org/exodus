import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@/components/ui/hover-card'
import { cn } from '@/lib/utils'
import { WebSearchResult } from '@shared/types/web-search'
import { useState } from 'react'

export function WebSearchGroup({
  webSearchResults,
  variant
}: {
  webSearchResults: WebSearchResult[]
  variant: 'overlapping' | 'tiling'
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  return (
    <span
      className={cn(
        {
          ['*:ring-background flex -space-x-2 *:ring-3']:
            variant === 'overlapping'
        },
        {
          ['mx-2 inline-flex gap-2']: variant === 'tiling'
        }
      )}
    >
      {webSearchResults.map((item, index) => (
        <HoverCard key={index} openDelay={0} closeDelay={0}>
          <HoverCardTrigger asChild>
            <a href={item.link} target="_blank" rel="noopener noreferrer">
              <Avatar
                className={cn(
                  'transition-transform',
                  {
                    ['z-10 scale-110']:
                      variant === 'overlapping' && activeIndex === index
                  },
                  {
                    ['h-4 w-4 border']: variant === 'tiling'
                  }
                )}
                onMouseEnter={() => {
                  if (variant === 'overlapping') {
                    setActiveIndex(index)
                  }
                }}
                onMouseLeave={() => {
                  if (variant === 'overlapping') {
                    setActiveIndex(null)
                  }
                }}
              >
                <AvatarImage src={item.favicon} alt={item.title} />
                <AvatarFallback>{item.title.charAt(0)}</AvatarFallback>
              </Avatar>
            </a>
          </HoverCardTrigger>
          <HoverCardContent className="w-60 rounded-lg border-0 p-0">
            {item.headImage ? (
              <img
                src={item.headImage}
                alt={item.title}
                className="h-32 w-full rounded-tl-lg rounded-tr-lg object-cover"
              />
            ) : null}
            <div className="p-3">
              <div className="mb-2 line-clamp-2 text-sm font-semibold">
                {item.title}
              </div>
              <div className="text-muted-foreground line-clamp-3 text-xs">
                {item.snippet}
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      ))}
    </span>
  )
}
