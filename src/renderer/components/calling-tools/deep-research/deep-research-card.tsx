import { Markdown } from '@/components/markdown'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { downloadFile } from '@/lib/utils'
import { markdownToPdf } from '@/services/tools'
import { activeDeepResearchIdAtom } from '@/stores/chat'
import { TooltipArrow } from '@radix-ui/react-tooltip'
import { DeepResearch } from '@shared/types/db'
import { differenceInMinutes } from 'date-fns'
import { useAtom } from 'jotai'
import { Download, Loader } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'

export function DeepResearchCard({
  toolResult
}: {
  toolResult: Pick<DeepResearch, 'id' | 'toolCallId'>
}) {
  const [loading, setLoading] = useState(false)
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

  const exportPdf = async () => {
    if (!deepResearchResult?.finalReport) return

    try {
      setLoading(true)
      // TODO: generate a title to final report as the filename of PDF
      const blob = await markdownToPdf(deepResearchResult.finalReport)
      downloadFile(blob, `${deepResearchResult.id}.pdf`)
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Failed to export data from database.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (deepResearchResult?.jobStatus === 'streaming') {
      setActiveDeepResearchId(toolResult.id)
    }

    return () => {
      setActiveDeepResearchId('')
    }
  }, [
    deepResearchResult,
    setActiveDeepResearchId,
    toolResult.id,
    toolResult.toolCallId
  ])

  return (
    <section>
      <div className="flex items-center justify-between">
        <Button
          variant={
            activeDeepResearchId === toolResult.id ? 'secondary' : 'ghost'
          }
          className="font-semibold"
          onClick={handleActiveDeepResearchSseId}
        >
          {deepResearchResult?.jobStatus === 'streaming' && (
            <div className="loading-shimmer-pure-text">Deep Researching...</div>
          )}
          {deepResearchResult?.jobStatus === 'archived' &&
            deepResearchResult?.endTime && (
              <div>
                {`Research completed in ${differenceInMinutes(deepResearchResult?.endTime, deepResearchResult?.startTime)}m · ${deepResearchResult?.webSources?.length ?? 0} sources`}
              </div>
            )}
        </Button>

        {!!deepResearchResult?.finalReport && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" onClick={exportPdf}>
                  {loading ? (
                    <Loader
                      size={14}
                      strokeWidth={2.5}
                      className="animate-spin"
                    />
                  ) : (
                    <Download />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-60">Download PDF</p>
                <TooltipArrow className="TooltipArrow" />
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

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
