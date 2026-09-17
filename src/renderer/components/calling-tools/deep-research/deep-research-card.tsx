import { DeepResearch } from '@shared/types/db'
import { WebSearchResult } from '@shared/types/web-search'
import { differenceInMinutes } from 'date-fns'
import { useAtom } from 'jotai'
import { DownloadIcon, LoaderIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { i18n } from '@/lib/i18n'
import { downloadFile } from '@/lib/utils'
import { markdownToPdf } from '@/services/tools'
import { activeDeepResearchIdAtom } from '@/stores/chat'

/**
 * Convert inline 【N-source】 markers to superscript [N] and append a
 * numbered References section — suitable for PDF rendering. This is a
 * plain helper (not a component or hook), so translated text uses the
 * shared `i18n` singleton directly rather than `useTranslation()`.
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
    if (!source) return i18n.t('chat:deepResearchCard.unknownSource', { rank })
    let hostname = ''
    try {
      hostname = new URL(source.link).hostname
    } catch {
      hostname = source.link
    }
    return `[${rank}] **${source.title}** (${hostname})  \n    <${source.link}>`
  })

  return `${processed}\n\n---\n\n## ${i18n.t('chat:deepResearchCard.referencesHeading')}\n\n${refLines.join('\n\n')}`
}

export function DeepResearchCard({
  toolResult
}: {
  toolResult: Pick<DeepResearch, 'id' | 'toolCallId'>
}) {
  const { t } = useTranslation('chat')
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
        title: t('deepResearchCard.exportFailedTitle'),
        description:
          e instanceof Error
            ? e.message
            : t('deepResearchCard.exportFailedDescription')
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
            <ShimmeringText text={t('deepResearchCard.researching')} />
          )}
          {deepResearchResult?.jobStatus === 'archived' &&
            deepResearchResult?.endTime && (
              <div>
                {t('deepResearchCard.completedSummary', {
                  minutes: differenceInMinutes(
                    deepResearchResult?.endTime,
                    deepResearchResult?.startTime
                  ),
                  count: deepResearchResult?.webSources?.length ?? 0
                })}
              </div>
            )}
        </Button>

        {!!deepResearchResult?.finalReport && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t('deepResearchCard.exportAriaLabel')}
                  onClick={exportPdf}
                >
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
                <p className="max-w-60">
                  {t('deepResearchCard.downloadPdfTooltip')}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {deepResearchResult?.finalReport ? (
        <Card className="mt-4 p-4">
          <Markdown
            src={deepResearchResult?.finalReport}
            webSearchResults={deepResearchResult.webSources ?? undefined}
          />
        </Card>
      ) : null}
    </section>
  )
}
