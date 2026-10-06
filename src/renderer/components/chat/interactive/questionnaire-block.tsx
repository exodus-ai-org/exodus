// A reply's questionnaire (`exodus-ask`) on the user's shadcn Questionnaire:
// one question at a time with Previous / Skip / Next, Submit on the last with
// the closing note above it. A blank is a Skip. Submit sends the answers as
// the user's next message (`composeAskAnswer`); once the chat holds that
// message the block is frozen, a summary of the picks it carried
// (`readPicks`) — the primitive hides an item it would disable.
import type { AskBlock, AskQuestion } from '@exodus/shared/types/interactive'
import {
  composeAskAnswer,
  readPicks,
  type QuestionResponse
} from '@exodus/shared/utils/interactive-answer'
import { CheckIcon } from 'lucide-react'
import { type FormEvent, type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle
} from '@/components/ui/questionnaire'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { answerLabels } from './answer-labels'
import type { Answered } from './interactive-context'

export interface BlockProps<B> {
  block: B
  /** The run whose reply holds the block: the answer's `ref`. */
  runId: string
  answered: Answered | null
  canSubmit: boolean
  submit: (text: string) => void
}

/** The value of a question's "Other…" choice. */
const OTHER = '__exodus_other__'

const CARD = 'bg-card text-card-foreground rounded-2xl border p-4'

const picksOther = (response: QuestionResponse | undefined) =>
  response !== undefined && response.other !== null

export function QuestionnaireBlock(props: BlockProps<AskBlock>) {
  return props.answered ? (
    <AnsweredQuestionnaire block={props.block} body={props.answered.body} />
  ) : (
    <OpenQuestionnaire {...props} />
  )
}

function OpenQuestionnaire({
  block,
  runId,
  canSubmit,
  submit
}: BlockProps<AskBlock>) {
  const { t } = useTranslation('chat')
  const [current, setCurrent] = useState(block.questions[0].id)
  const [responses, setResponses] = useState<Record<string, QuestionResponse>>(
    {}
  )
  const [note, setNote] = useState('')
  const index = Math.max(
    0,
    block.questions.findIndex((q) => q.id === current)
  )
  const onLast = index === block.questions.length - 1

  const respond = (
    question: AskQuestion,
    change: (response: QuestionResponse) => QuestionResponse
  ) =>
    setResponses((previous) => ({
      ...previous,
      [question.id]: change(
        previous[question.id] ?? { options: [], other: null }
      )
    }))

  const pick = (question: AskQuestion, value: string, checked: boolean) =>
    respond(question, (response) => {
      if (question.type === 'single') {
        if (!checked) return response
        return value === OTHER
          ? { options: [], other: response.other ?? '' }
          : { options: [value], other: null }
      }
      if (value === OTHER) {
        return { ...response, other: checked ? (response.other ?? '') : null }
      }
      return {
        ...response,
        options: checked
          ? [...response.options, value]
          : response.options.filter((o) => o !== value)
      }
    })

  // A skipped question is a blank: what was picked before Skip is dropped.
  const skip = (question: AskQuestion) =>
    setResponses((previous) => {
      const next = { ...previous }
      delete next[question.id]
      return next
    })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return
    submit(composeAskAnswer(block, runId, responses, note, answerLabels(t)))
  }

  return (
    <div data-interactive="ask" data-state="open" className={CARD}>
      <p className="text-sm font-semibold text-pretty">{block.title}</p>
      {block.questions.length > 1 && (
        <p
          aria-live="polite"
          className="text-muted-foreground mt-1 text-[0.625rem] font-medium tabular-nums"
        >
          {t('interactive.progress', {
            current: index + 1,
            total: block.questions.length
          })}
        </p>
      )}
      <Questionnaire
        item={current}
        onItemChange={setCurrent}
        onSubmit={onSubmit}
        className="mt-3"
      >
        {block.questions.map((question) => {
          const response = responses[question.id]
          return (
            <QuestionnaireItem
              key={question.id}
              name={question.id}
              multiple={question.type === 'multi'}
              onStatusChange={(status) => {
                if (status === 'skipped') skip(question)
              }}
            >
              <QuestionnaireTitle>{question.text}</QuestionnaireTitle>
              <QuestionnaireChoices>
                {question.options.map((option) => (
                  <QuestionnaireChoice
                    key={option}
                    value={option}
                    checked={response?.options.includes(option) ?? false}
                    onChange={(event) =>
                      pick(question, option, event.target.checked)
                    }
                  >
                    {option}
                  </QuestionnaireChoice>
                ))}
                {question.other && (
                  <QuestionnaireChoice
                    value={OTHER}
                    checked={picksOther(response)}
                    onChange={(event) =>
                      pick(question, OTHER, event.target.checked)
                    }
                  >
                    {t('interactive.other')}
                  </QuestionnaireChoice>
                )}
              </QuestionnaireChoices>
              {question.other && picksOther(response) && (
                <QuestionnaireInput
                  value={response?.other ?? ''}
                  onChange={(event) => {
                    const text = event.target.value
                    respond(question, (r) => ({ ...r, other: text }))
                  }}
                  placeholder={t('interactive.otherPlaceholder')}
                  aria-label={t('interactive.otherPlaceholder')}
                />
              )}
              <QuestionnaireError>
                {t('interactive.chooseOrSkip')}
              </QuestionnaireError>
            </QuestionnaireItem>
          )
        })}
        {onLast && (
          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs">
              {block.note || t('interactive.noteDefault')}
            </span>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('interactive.notePlaceholder')}
              rows={2}
            />
          </label>
        )}
        <QuestionnaireActions>
          <QuestionnairePrevious>
            {t('interactive.previous')}
          </QuestionnairePrevious>
          <QuestionnaireSkip>{t('interactive.skip')}</QuestionnaireSkip>
          <QuestionnaireNext>{t('interactive.next')}</QuestionnaireNext>
          <QuestionnaireSubmit disabled={!canSubmit}>
            {block.submit || t('interactive.submit')}
          </QuestionnaireSubmit>
        </QuestionnaireActions>
      </Questionnaire>
    </div>
  )
}

function AnsweredQuestionnaire({
  block,
  body
}: {
  block: AskBlock
  body: string
}) {
  const { t } = useTranslation('chat')
  const picks = readPicks(block, body)
  return (
    <div data-interactive="ask" data-state="answered" className={CARD}>
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
