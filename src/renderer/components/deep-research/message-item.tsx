import { DeepResearchMessage } from '@shared/types/db'
import {
  DeepResearchProgress,
  ReportProgressPayload
} from '@shared/types/deep-research'
import { Bot, Search } from 'lucide-react'
import { SourceItem } from './source-item'

export function MessageItem({
  deepResearchMessage
}: {
  deepResearchMessage: DeepResearchMessage
}) {
  const payload = deepResearchMessage.message.params
    ?.data as unknown as ReportProgressPayload

  return (
    <>
      {payload.type === DeepResearchProgress.StartDeepResearch && (
        <div className="flex items-center gap-2">
          <Bot
            className="mt-px shrink-0 rounded-full border p-1"
            size={24}
            strokeWidth={2.5}
          />
          Start deep researching...
        </div>
      )}

      {payload.type === DeepResearchProgress.EmitLearnings && (
        <div className="flex gap-2">
          <Bot
            className="mt-px shrink-0 rounded-full border p-1"
            size={24}
            strokeWidth={2.5}
          />
          <div className="flex flex-col gap-2">
            Deep researched {payload.learnings?.length} items from the previous
            web resources:
            <ul className="!m-0 text-sm">
              {payload.learnings?.map((item) => (
                <li key={item.learning} className="last:mb-0">
                  {item.learning}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {payload.type === DeepResearchProgress.EmitSearchQueries && (
        <div className="flex gap-2">
          <Bot
            className="mt-px shrink-0 rounded-full border p-1"
            size={24}
            strokeWidth={2.5}
          />
          <div className="flex flex-col gap-2">
            Generated {payload.searchQueries?.length} search queries for &quot;
            {payload.query}&quot;:
            <ul className="!m-0 text-sm">
              {payload.searchQueries?.map((item) => (
                <li key={item.query} className="last:mb-0">
                  {item.query}
                </li>
              ))}
            </ul>{' '}
          </div>
        </div>
      )}

      {payload.type === DeepResearchProgress.EmitSearchResults && (
        <div className="flex gap-2">
          <Search
            className="mt-px shrink-0 rounded-full border p-1"
            size={24}
            strokeWidth={2.5}
          />
          <div className="flex flex-col gap-2">
            Searched for &quot;
            {payload.query}&quot;
            <SourceItem webSearchResults={payload.webSearchResults} />
          </div>
        </div>
      )}

      {payload.type === DeepResearchProgress.StartWritingFinalReport && (
        <div className="flex items-center gap-2">
          <Bot
            className="mt-px shrink-0 rounded-full border p-1"
            size={24}
            strokeWidth={2.5}
          />
          Start writing final report
        </div>
      )}

      {payload.type === DeepResearchProgress.CompleteDeepResearch && (
        <div className="flex items-center gap-2">
          <Bot
            className="mt-px shrink-0 rounded-full border p-1"
            size={24}
            strokeWidth={2.5}
          />
          Completed deep research
        </div>
      )}
    </>
  )
}
