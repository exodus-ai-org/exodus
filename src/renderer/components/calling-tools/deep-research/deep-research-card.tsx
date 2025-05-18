import { Markdown } from '@/components/markdown'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { activeDeepResearchIdAtom } from '@/stores/chat'
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
  const [activeDeepResearchId, setActiveDeepResearchId] = useAtom(
    activeDeepResearchIdAtom
  )

  const { data: deepResearchResult } = useSWR<DeepResearch>(
    `/api/deep-research/result/${toolResult.id}`
  )

  const handleActiveDeepResearchSseId = () => {
    if (activeDeepResearchId) {
      setActiveDeepResearchId('')
    } else {
      setActiveDeepResearchId(toolResult.id)
    }
  }

  useEffect(() => {
    if (deepResearchResult?.jobStatus === 'streaming') {
      setActiveDeepResearchId(toolResult.id)
    }
  }, [
    deepResearchResult,
    setActiveDeepResearchId,
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
              {`Research completed in ${differenceInMinutes(deepResearchResult?.endTime, deepResearchResult?.startTime)}m · ${deepResearchResult?.webSources?.length ?? 0} sources`}
            </div>
          )}
      </Button>

      {deepResearchResult?.finalReport ? (
        <Card className="mt-4 p-4">
          <Markdown
            src={deepResearchResult?.finalReport}
            parts={[
              {
                type: 'tool-invocation',
                toolInvocation: {
                  state: 'result',
                  toolCallId: '',
                  toolName: 'webSearch',
                  args: {},
                  result: deepResearchResult.webSources
                }
              }
            ]}
          />
        </Card>
      ) : null}
    </section>
  )
}
