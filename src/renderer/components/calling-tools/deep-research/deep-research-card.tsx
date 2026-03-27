import { DeepResearch } from '@shared/types/db'
import { WebSearchResult } from '@shared/types/web-search'
import { differenceInMinutes } from 'date-fns'
import { useAtom } from 'jotai'
import { DownloadIcon, LoaderIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { sileo } from 'sileo'
import useSWR from 'swr'

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

/**
 * Convert inline 【N-source】 markers to superscript [N] and append a
 * numbered References section — suitable for PDF rendering.
 */
function prepareMarkdownForPdf(
  markdown: string,
  webSources: WebSearchResult[]
): string {
  const citationRegex = /【([\d,\s]+)-source】/g

  // Collect citation ranks in order of first appearance (deduplicated)
  const seenRanks = new Set<number>()
  const orderedRanks: number[] = []
  for (const match of markdown.matchAll(citationRegex)) {
    for (const part of match[1].split(',')) {
      const n = parseInt(part.trim(), 10)
      if (!isNaN(n) && !seenRanks.has(n)) {
        seenRanks.add(n)
        orderedRanks.push(n)
      }
    }
  }

  // Replace markers with superscript HTML (MarkdownIt passes inline HTML through)
  const processed = markdown.replace(citationRegex, (_, numsStr: string) => {
    return numsStr
      .split(',')
      .map((p) => parseInt(p.trim(), 10))
      .filter((n) => !isNaN(n))
      .map((n) => `<sup>[${n}]</sup>`)
      .join('')
  })

  if (orderedRanks.length === 0) return processed

  // Build a numbered References list
  const refLines = orderedRanks.map((rank) => {
    const source = webSources.find((s) => s.rank === rank)
    if (!source) return `[${rank}] Unknown source`
    let hostname = ''
    try {
      hostname = new URL(source.link).hostname
    } catch {
      hostname = source.link
    }
    return `[${rank}] **${source.title}** (${hostname})  \n    <${source.link}>`
  })

  return `${processed}\n\n---\n\n## References\n\n${refLines.join('\n\n')}`
}

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
      const pdfMarkdown = prepareMarkdownForPdf(
        deepResearchResult.finalReport,
        deepResearchResult.webSources ?? []
      )
      const blob = await markdownToPdf(pdfMarkdown)
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
                type: 'tool-call' as const,
                toolCallId: '',
                toolName: 'webSearch',
                args: {},
                state: 'done' as const,
                result: deepResearchResult.webSources
              }
            ]}
          />
        </Card>
      ) : null}
    </section>
  )
}
