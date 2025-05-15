import { DeepResearchMessage } from '@shared/types/db'
import {
  DeepResearchProgress,
  ReportProgressPayload
} from '@shared/types/deep-research'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'

export function MessageItem({
  deepResearchMessage
}: {
  deepResearchMessage: DeepResearchMessage
}) {
  const payload = deepResearchMessage.message.params
    ?.data as unknown as ReportProgressPayload

  return (
    <div className="markdown hover:bg-accent rounded-xl p-2 whitespace-pre-wrap">
      {payload.type === DeepResearchProgress.StartDeepResearch && (
        <div>
          <strong className="loading-shimmer-pure-text">
            Start deep researching...
          </strong>
        </div>
      )}

      {payload.type === DeepResearchProgress.EmitLearnings && (
        <div>
          <strong>
            Deep research {payload.learnings?.length} items from the previous
            web resources:
          </strong>
          <ul className="text-sm last:mb-0">
            {payload.learnings?.map((item) => (
              <li key={item.learning} className="last:mb-0">
                {item.learning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {payload.type === DeepResearchProgress.EmitSearchObjectives && (
        <div>
          <strong>
            Generate {payload.searchObjectives?.length} search queries:
          </strong>
          <ul className="text-sm last:mb-0">
            {payload.searchObjectives?.map((item) => (
              <li key={item.query} className="last:mb-0">
                {item.query}
              </li>
            ))}
          </ul>
        </div>
      )}

      {payload.type === DeepResearchProgress.RequestLearnings && (
        <div>
          <strong>
            {payload.deeper ? 'Deep searched' : 'Searched'} web resources for
            &quot;
            {payload.query}&quot;
          </strong>

          <div className="my-4 flex flex-col gap-4 text-sm">
            {payload.webSearchResults?.map((item) => (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                key={item.link}
                className="flex flex-col gap-1 rounded-xl p-2"
              >
                <div className="flex w-full items-center gap-2">
                  <Avatar className="size-6 border">
                    <AvatarImage src={item.favicon} className="object-cover" />
                    <AvatarFallback>{item.title?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="text-primary line-clamp-1 text-sm">
                    {item.title}
                  </div>
                </div>
                <div className="text-ring line-clamp-2 text-xs">
                  {item.snippet}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {payload.type === DeepResearchProgress.RequestWebSearch && (
        <div>
          <strong className="loading-shimmer-pure-text">
            {payload.deeper ? 'Deep searching' : 'Searching'} web resources for{' '}
            &quot;{payload.query}&quot;
          </strong>
        </div>
      )}

      {payload.type === DeepResearchProgress.RequestWriteFinalReport && (
        <div>
          <strong className="loading-shimmer-pure-text">
            Start writing final report
          </strong>
        </div>
      )}

      {payload.type === DeepResearchProgress.CompleteDeepResearch && (
        <div>
          <strong>Complete deep researching</strong>
        </div>
      )}
    </div>
  )
}
