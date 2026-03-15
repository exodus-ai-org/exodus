import { Markdown } from '@/components/markdown'
import { ShimmeringText } from '@/components/shimmering-text'
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

import { DeepResearch } from '@shared/types/db'
import { differenceInMinutes } from 'date-fns'
import { useAtom } from 'jotai'
import { DownloadIcon, LoaderIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { sileo } from 'sileo'
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
      sileo.error({
        title: 'Export failed',
        description:
          e instanceof Error ? e.message : 'Failed to generate PDF report.'
      })
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
            <ShimmeringText text="Deep Researching..." />
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
              <TooltipTrigger>
                <Button size="icon" variant="ghost" onClick={exportPdf}>
                  {loading ? (
                    <LoaderIcon
                      size={14}
                      strokeWidth={2.5}
                      className="animate-spin"
                    />
                  ) : (
                    <DownloadIcon />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-60">Download PDF</p>
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
                type: 'tool-webSearch' as `tool-${string}`,
                toolCallId: '',
                state: 'output-available' as const,
                input: {},
                output: deepResearchResult.webSources
              }
            ]}
          />
        </Card>
      ) : null}
    </section>
  )
}
