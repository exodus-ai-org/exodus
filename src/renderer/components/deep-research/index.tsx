import { cn } from '@/lib/utils'
import { activeDeepResearchSseIdAtom } from '@/stores/chat'
import { BASE_URL } from '@shared/constants/systems'
import { DeepResearch, DeepResearchMessage } from '@shared/types/db'
import {
  DeepResearchProgress,
  ReportProgressPayload
} from '@shared/types/deep-research'
import { motion } from 'framer-motion'
import { useAtom } from 'jotai'
import { X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
  const { data: deepResearchResult, mutate: muteResult } = useSWR<DeepResearch>(
    activeDeepResearchSseId
      ? `/api/deep-research/result/${activeDeepResearchSseId}`
      : null
  )
  const { data: deepResearchMessages, mutate } = useSWR<DeepResearchMessage[]>(
    activeDeepResearchSseId
      ? `/api/deep-research/messages/${activeDeepResearchSseId}`
      : null,
    {
      fallbackData: []
    }
  )

  const allWebSearchResults = useMemo(
    () =>
      deepResearchMessages
        ?.map(
          (item) =>
            item.message.params?.data as unknown as ReportProgressPayload
        )
        .filter((item) => item.type === DeepResearchProgress.EmitSearchResults)
        ?.map((item) => item.webSearchResults)
        ?.flat() ?? [],
    [deepResearchMessages]
  )

  useEffect(() => {
    if (!activeDeepResearchSseId) return
    if (deepResearchResult?.jobStatus !== 'streaming') return

    const source = new EventSource(
      `${BASE_URL}/api/deep-research/sse?deepResearchId=${activeDeepResearchSseId}`
    )

    source.onopen = () => {
      console.log('SSE connection opened')
    }

    source.onmessage = (event) => {
      try {
        const { data: deepResearchMessage } = JSON.parse(event.data) as {
          data?: DeepResearchMessage
        }

        if (!deepResearchMessage) return

        const reportProgressPayload = deepResearchMessage?.message.params
          ?.data as unknown as ReportProgressPayload

        if (
          reportProgressPayload.type ===
          DeepResearchProgress.CompleteDeepResearch
        ) {
          muteResult()
          source.close()
        } else {
          mutate(
            deepResearchMessages
              ? [...deepResearchMessages, deepResearchMessage].toSorted(
                  (a, b) => +a.createdAt - +b.createdAt
                )
              : [deepResearchMessage],
            false
          )
        }
      } catch (error) {
        console.error('Error parsing event data:', error)
        source.close()
      }
    }

    source.onerror = (error) => {
      console.error('SSE error:', error)
      if (source.readyState === EventSource.CLOSED) {
        console.log('SSE connection closed')
      }
      source.close()
    }

    return () => {
      if (source) {
        console.log('SSE connection closed by component unmount')
        source.close()
      }
    }
  }, [
    activeDeepResearchSseId,
    deepResearchMessages,
    deepResearchResult?.jobStatus,
    mutate,
    muteResult
  ])

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
      <div className="markdown flex max-h-[calc(100dvh-3.8125rem)] flex-col gap-4 overflow-y-scroll p-4">
        {tab === Tab.Activity &&
          deepResearchMessages?.map((deepResearchMessage, i) => (
            <MessageItem
              key={i}
              webSearchResults={allWebSearchResults}
              deepResearchMessage={deepResearchMessage}
            />
          ))}

        {tab === Tab.Source && (
          <SourceItem webSearchResults={allWebSearchResults} />
        )}
      </div>
    </motion.div>
  )
}
