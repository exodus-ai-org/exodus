import { Markdown } from '@/components/markdown'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { activeDeepResearchSseIdAtom } from '@/stores/chat'
import { DeepResearch } from '@shared/types/db'
import { differenceInMinutes } from 'date-fns'
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
        {deepResearchResult?.jobStatus === 'streaming' && (
          <div className="loading-shimmer-pure-text">Deep Researching</div>
        )}
        {deepResearchResult?.jobStatus === 'archived' &&
          deepResearchResult?.endTime && (
            <div>
              {`Research completed in ${differenceInMinutes(deepResearchResult?.endTime, deepResearchResult?.startTime)}m · 74 sources · 10 searches`}
            </div>
          )}
      </Button>

      {deepResearchResult?.finalReport ? (
        <Card className="mt-4 p-4">
          <Markdown src={deepResearchResult?.finalReport} />
        </Card>
      ) : null}
    </section>
  )
}
