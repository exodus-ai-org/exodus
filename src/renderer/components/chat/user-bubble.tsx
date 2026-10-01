import { splitHealth } from '@exodus/shared/utils/health-context'
import { splitQuoted } from '@exodus/shared/utils/quoted-text'
import { memo } from 'react'

import { HealthContextCard } from '@/components/chat/health-context-card'

/**
 * What the user said. A message that was asked about a selection opens with
 * it as a markdown quote (`composeQuoted`): drawn as the quote it is, small
 * and to the side of a rule, over the question. One asked from the phone's
 * Health workspace opens with the numbers it was about (`splitHealth`),
 * before any quote: drawn as a card of chips. `data-askable`: text in here
 * can be asked about in turn (`SelectionAsk`).
 */
export const UserBubble = memo(function UserBubble({ text }: { text: string }) {
  const health = splitHealth(text)
  const { quote, body } = splitQuoted(health.body)
  return (
    <div
      data-askable=""
      className="bg-bubble text-foreground max-w-[75%] rounded-2xl rounded-br-sm px-4 py-2.5 text-base leading-relaxed wrap-break-word whitespace-pre-wrap"
    >
      {health.json !== null && <HealthContextCard json={health.json} />}
      {quote !== null && (
        <blockquote
          title={quote}
          className="border-primary-ink/40 text-muted-foreground line-clamp-3 border-l-2 pl-2.5 text-sm leading-normal not-last:mb-1.5"
        >
          {quote}
        </blockquote>
      )}
      {body !== '' && <p>{body}</p>}
    </div>
  )
})
