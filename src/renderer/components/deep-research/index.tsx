import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { fetchDeepResearchMessages } from '@/services/deep-research'
import {
  activeDeepResearchIdAtom,
  deepResearchMessagesAtom
} from '@/stores/chat'
import { BASE_URL } from '@shared/constants/systems'
import { DeepResearch, DeepResearchMessage } from '@shared/types/db'
import {
  DeepResearchProgress,
  ReportProgressPayload
} from '@shared/types/deep-research'
import { motion } from 'framer-motion'
import { useAtom } from 'jotai'
import { X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { MessageItem } from './message-item'
import { SourceItem } from './source-item'

enum Tab {
  Activity,
  Source
}

export function DeepResearchProcess() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [tab, setTab] = useState(Tab.Activity)
  const [activeDeepResearchId, setActiveDeepResearchId] = useAtom(
    activeDeepResearchIdAtom
  )
  const [deepResearchMessages, setDeepResearchMessages] = useAtom(
    deepResearchMessagesAtom
  )
  const { data: deepResearchResult, mutate: mutateResult } =
    useSWR<DeepResearch>(
      activeDeepResearchId
        ? `/api/deep-research/result/${activeDeepResearchId}`
        : null
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
    if (!activeDeepResearchId) return

    const initial = async () => {
      const messages = await fetchDeepResearchMessages(activeDeepResearchId)
      setDeepResearchMessages(messages)

      if (deepResearchResult?.jobStatus !== 'streaming') return

      const source = new EventSource(
        `${BASE_URL}/api/deep-research/sse?deepResearchId=${activeDeepResearchId}`
      )

      source.onopen = () => {
        console.log('SSE connection opened')
      }

      source.onmessage = (event) => {
        try {
          const deepResearchMessage = JSON.parse(
            event.data
          ) as DeepResearchMessage

          if (!deepResearchMessage) return

          const reportProgressPayload = deepResearchMessage?.message.params
            ?.data as unknown as ReportProgressPayload

          if (
            reportProgressPayload.type ===
            DeepResearchProgress.CompleteDeepResearch
          ) {
            mutateResult()
            source.close()
          } else {
            setDeepResearchMessages((prev) =>
              prev
                ? [...prev, deepResearchMessage].toSorted(
                    (a, b) => +a.createdAt - +b.createdAt
                  )
                : [deepResearchMessage]
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
        console.log('SSE connection closed by component unmount')
        source.close()
      }
    }

    const cleanupPromise = initial()
    return () => {
      cleanupPromise?.then((cleanup) => cleanup?.())
    }
  }, [
    activeDeepResearchId,
    deepResearchResult?.jobStatus,
    mutateResult,
    setDeepResearchMessages
  ])

  useEffect(() => {
    if (ref.current) {
      const $el = ref.current
      $el.scrollTo({
        top: $el.scrollHeight,
        left: 0,
        behavior: 'smooth'
      })
    }
  }, [deepResearchMessages])

  return (
    <section
      className={cn(
        'invisible h-svh w-0 overflow-x-hidden border-l transition-[width] duration-200',
        {
          ['visible w-[25rem] border-l transition-[width] duration-200']:
            activeDeepResearchId !== ''
        }
      )}
    >
      <div className="relative flex h-14 items-center justify-center border-b">
        <div className="bg-border flex items-center rounded-full p-1 text-sm">
          <button
            className={cn(
              'bg-border min-w-20 rounded-full p-2 select-none hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent',
              {
                ['bg-background hover:bg-background dark:bg-background-foreground hover:dark:bg-background-foreground font-semibold shadow-sm']:
                  tab === Tab.Activity
              }
            )}
            onClick={() => setTab(Tab.Activity)}
          >
            Activity
          </button>
          <button
            className={cn(
              'bg-border min-w-20 rounded-full p-2 select-none hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent',
              {
                ['bg-background hover:bg-background dark:bg-background-foreground hover:dark:bg-background-foreground font-semibold shadow-sm']:
                  tab === Tab.Source
              }
            )}
            onClick={() => setTab(Tab.Source)}
          >
            {allWebSearchResults.length} Sources
          </button>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-3 rounded-full"
          onClick={() => setActiveDeepResearchId('')}
        >
          <X />
        </Button>
      </div>
      {activeDeepResearchId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="markdown flex max-h-[calc(100dvh-3.8125rem)] flex-col gap-4 overflow-y-scroll p-3"
          ref={ref}
        >
          {tab === Tab.Activity &&
            deepResearchMessages?.map((deepResearchMessage, i) => (
              <MessageItem key={i} deepResearchMessage={deepResearchMessage} />
            ))}

          {tab === Tab.Source && (
            <SourceItem webSearchResults={allWebSearchResults} />
          )}
        </motion.div>
      )}
    </section>
  )
}
