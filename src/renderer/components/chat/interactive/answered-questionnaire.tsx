// A questionnaire once the chat holds its answer: frozen, a summary of the
// picks the answer carried (`readPicks`) — named for a screen reader by its
// title and picks, and given the focus when it was answered from here.
import type { AskBlock } from '@exodus/shared/types/interactive'
import {
  BLANK_ANSWER,
  readPicks
} from '@exodus/shared/utils/interactive-answer'
import { CheckIcon } from 'lucide-react'
import { type ReactNode, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

const CARD = 'bg-card text-card-foreground rounded-2xl border p-4'

export function AnsweredQuestionnaire({
  block,
  body,
  takeFocus
}: {
  block: AskBlock
  body: string
  /** Just answered from this block: the summary takes the form's focus. */
  takeFocus: boolean
}) {
  const { t } = useTranslation('chat')
  const picks = readPicks(block, body)
  const summary = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (takeFocus) summary.current?.focus()
  }, [takeFocus])
  // What a screen reader names the frozen block by: its title, that it is
  // answered, then each question and what was picked.
  const answers = block.questions.map((question) => {
    const pick = picks[question.id]
    const chosen = [
      ...(pick?.options ?? []),
      ...(question.other && pick?.other ? [t('interactive.other')] : [])
    ]
    const answer = chosen.length > 0 ? chosen.join(', ') : BLANK_ANSWER
    return `${question.text} ${answer}`
  })
  const label = `${block.title} — ${t('interactive.answered')}. ${answers.join('; ')}`
  return (
    <div
      ref={summary}
      role="group"
      aria-label={label}
      tabIndex={-1}
      data-interactive="ask"
      data-state="answered"
      className={cn(CARD, 'outline-none')}
    >
      <p className="text-sm font-semibold text-pretty">{block.title}</p>
      <ol className="mt-3 flex flex-col gap-3">
        {block.questions.map((question, i) => (
          <li key={question.id}>
            <p className="text-sm font-medium">{`${i + 1}. ${question.text}`}</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {question.options.map((option) => (
                <Pick
                  key={option}
                  picked={picks[question.id]?.options.includes(option) ?? false}
                >
                  {option}
                </Pick>
              ))}
              {question.other && picks[question.id]?.other && (
                <Pick picked>{t('interactive.other')}</Pick>
              )}
            </ul>
          </li>
        ))}
      </ol>
      <p className="text-muted-foreground mt-3 flex items-center gap-1.5 text-xs">
        <CheckIcon aria-hidden className="size-3.5" />
        {t('interactive.answered')}
      </p>
    </div>
  )
}

function Pick({ picked, children }: { picked: boolean; children: ReactNode }) {
  return (
    <li
      data-picked={picked ? '' : undefined}
      className={cn(
        'flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs',
        picked ? 'border-primary/40 bg-primary/10' : 'text-muted-foreground'
      )}
    >
      {picked && <CheckIcon aria-hidden className="size-3" />}
      {children}
    </li>
  )
}
