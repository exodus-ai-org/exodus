import { Markdown } from '@/components/markdown'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { activeDeepResearchSseIdAtom } from '@/stores/chat'
import { DeepResearch } from '@shared/types/db'
import { useAtom } from 'jotai'
import { useEffect } from 'react'
import useSWR from 'swr'

export function DeepResearchCard({
  toolResult
}: {
  toolResult: Pick<DeepResearch, 'id' | 'toolCallId'>
}) {
  const [activeDeepResearchSseId, setActiveDeepResearchSseId] = useAtom(
    activeDeepResearchSseIdAtom
  )

  const { data: deepResearchResult } = useSWR<DeepResearch>(
    `/api/deep-research/result/${toolResult.id}`
  )

  const handleActiveDeepResearchSseId = () => {
    if (activeDeepResearchSseId) {
      setActiveDeepResearchSseId('')
    } else {
      setActiveDeepResearchSseId(toolResult.id)
    }
  }

  useEffect(() => {
    if (deepResearchResult?.jobStatus === 'streaming') {
      setActiveDeepResearchSseId(toolResult.id)
    }
  }, [
    deepResearchResult,
    setActiveDeepResearchSseId,
    toolResult.id,
    toolResult.toolCallId
  ])

  return (
    <section>
      <Button
        variant="ghost"
        className="cursor-pointer font-semibold"
        onClick={handleActiveDeepResearchSseId}
      >
        <div
          className={cn({
            'loading-shimmer-pure-text':
              deepResearchResult?.jobStatus === 'streaming'
          })}
        >
          Research completed in 6m · 74 sources · 10 searches
        </div>
      </Button>

      {deepResearchResult?.finalReport ? (
        <Card className="mt-4 p-4">
          <Markdown src={deepResearchResult?.finalReport}></Markdown>
        </Card>
      ) : null}
    </section>
  )
}
