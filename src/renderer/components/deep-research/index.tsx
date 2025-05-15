import { cn } from '@/lib/utils'
import { activeDeepResearchSseIdAtom } from '@/stores/chat'
import { DeepResearchMessage } from '@shared/types/db'
import { ReportProgressPayload } from '@shared/types/deep-research'
import { WebSearchResult } from '@shared/types/web-search'
import { motion } from 'framer-motion'
import { useAtom } from 'jotai'
import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Button } from '../ui/button'
import { MessageItem } from './message-item'
import { SourceItem } from './source-item'

enum Tab {
  Activity,
  Source
}

export function DeepResearchProcess() {
  const [tab, setTab] = useState(Tab.Activity)
  const [activeDeepResearchSseId, setActiveDeepResearchSseId] = useAtom(
    activeDeepResearchSseIdAtom
  )
  const { data: deepResearchMessages } = useSWR<DeepResearchMessage[]>(
    activeDeepResearchSseId
      ? `/api/deep-research/messages/${activeDeepResearchSseId}`
      : null,
    {
      fallbackData: []
    }
  )

  const allWebSearchResults = useMemo(
    () =>
      (
        deepResearchMessages
          ?.map(
            (item) =>
              (item.message.params?.data as unknown as ReportProgressPayload)
                .webSearchResults
          )
          ?.flat() ?? []
      ).filter(Boolean) as WebSearchResult[],
    [deepResearchMessages]
  )

  // useEffect(() => {
  //   if (!toolResult) return

  //   const source = new EventSource(
  //     `${BASE_URL}/api/deep-research/sse?deepResearchId=${toolResult.id}`
  //   )

  //   source.onopen = () => {
  //     console.log('SSE connection opened')
  //   }

  //   source.onmessage = (event) => {
  //     try {
  //       console.log(JSON.parse(event.data))
  //       // const data = JSON.parse(event.data) as { data: DeepResearchMessage }
  //       // const payload = data.data.message.params as {
  //       //   data: ReportProgressPayload
  //       // }

  //       // if (payload.data.type === DeepResearchProgress.CompleteDeepResearch) {
  //       //   source.close()
  //       // } else {
  //       //   setDeepResearchMessages((prev) => [...prev, payload.data])
  //       // }
  //     } catch (error) {
  //       console.error('Error parsing event data:', error)
  //       // source.close()
  //     }
  //   }

  //   source.onerror = (error) => {
  //     console.error('SSE error:', error)
  //     if (source.readyState === EventSource.CLOSED) {
  //       console.log('SSE connection closed')
  //     }
  //     // source.close()
  //   }

  //   return () => {
  //     if (source) {
  //       console.log('SSE connection closed by component unmount')
  //       source.close()
  //     }
  //   }
  // }, [toolResult, toolResult.id])

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="h-screen w-[25rem] border-l"
    >
      <div className="relative flex items-center justify-center border-b py-2">
        <div className="bg-border flex items-center rounded-full border-4 transition-all">
          <Button
            variant="ghost"
            className={cn(
              'bg-border min-w-24 rounded-full px-2 py-1 select-none hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent',
              {
                ['bg-background hover:bg-background dark:bg-background-foreground hover:dark:bg-background-foreground shadow-sm']:
                  tab === Tab.Activity
              }
            )}
            onClick={() => setTab(Tab.Activity)}
          >
            Activity
          </Button>
          <Button
            variant="ghost"
            className={cn(
              'bg-border min-w-24 rounded-full px-2 py-1 select-none hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent',
              {
                ['bg-background hover:bg-background dark:bg-background-foreground hover:dark:bg-background-foreground shadow-sm']:
                  tab === Tab.Source
              }
            )}
            onClick={() => setTab(Tab.Source)}
          >
            {allWebSearchResults.length} Sources
          </Button>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-3 rounded-full"
          onClick={() => setActiveDeepResearchSseId('')}
        >
          <X />
        </Button>
      </div>
      <div className="flex max-h-[calc(100dvh-3.8125rem)] flex-col gap-2 overflow-y-scroll p-2">
        {tab === Tab.Activity &&
          deepResearchMessages?.map((deepResearchMessage, i) => (
            <MessageItem key={i} deepResearchMessage={deepResearchMessage} />
          ))}

        {tab === Tab.Source && (
          <SourceItem allWebSearchResults={allWebSearchResults} />
        )}
      </div>
    </motion.div>
  )
}
