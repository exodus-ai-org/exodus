import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription } from '@/components/ui/card'
import { WebSearchResultWithoutTokenCount } from '@shared/types/web-search'
import { useEffect, useState } from 'react'

export function WebSearchCard({ toolResult }: { toolResult: string }) {
  const [dataSource, setDataSource] = useState<
    WebSearchResultWithoutTokenCount[] | null
  >(null)

  useEffect(() => {
    try {
      setDataSource(JSON.parse(toolResult))
    } catch {
      // Do nothing...
    }
  }, [toolResult])

  if (!dataSource) return null

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        {dataSource.map((item, idx) => (
          <div key={idx} className="flex gap-4">
            <Avatar className="relative top-1 h-6 w-6 items-center border">
              {item.favicon && (
                <AvatarImage src={item.favicon} alt={item.title} />
              )}
              <AvatarFallback>{item.title.charAt(0)}</AvatarFallback>
            </Avatar>

            <div>
              <a
                className="text-sm text-blue-500 hover:underline"
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.title}
              </a>
              <CardDescription>{item.snippet}</CardDescription>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
