// A reply's confirmation (`exodus-confirm`): what will happen, a note, and
// Approve / Reject — pending until the chat holds the answer, then the
// decision (ai-sdk's Confirmation states). The details are Markdown, drawn
// with react-markdown directly: `markdown.tsx` draws this block.
import type { ConfirmBlock } from '@exodus/shared/types/interactive'
import { composeConfirmAnswer } from '@exodus/shared/utils/interactive-answer'
import { CheckIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { remarkPluginsStable } from '@/lib/markdown-plugins'

import { answerLabels } from './answer-labels'
import type { BlockProps } from './questionnaire-block'

export function ConfirmationBlock({
  block,
  runId,
  answered,
  canSubmit,
  submit
}: BlockProps<ConfirmBlock>) {
  const { t } = useTranslation('chat')
  const [note, setNote] = useState('')
  const decision = answered?.head.decision ?? null
  const state = answered ? (decision ?? 'answered') : 'open'

  const send = (approved: boolean) => {
    if (!canSubmit) return
    submit(composeConfirmAnswer(block, runId, approved, note, answerLabels(t)))
  }

  return (
    <div
      data-interactive="confirm"
      data-state={state}
      className="bg-card text-card-foreground rounded-2xl border p-4"
    >
      <p className="text-sm font-semibold text-pretty">{block.title}</p>
      {block.details && (
        <section className="markdown text-muted-foreground mt-1.5 text-sm">
          <ReactMarkdown remarkPlugins={remarkPluginsStable}>
            {block.details}
          </ReactMarkdown>
        </section>
      )}
      {answered ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium">
          {decision === 'reject' ? (
            <XIcon aria-hidden className="text-muted-foreground size-4" />
          ) : (
            <CheckIcon aria-hidden className="text-primary-ink size-4" />
          )}
          {decision === 'approve' && t('interactive.approved')}
          {decision === 'reject' && t('interactive.rejected')}
          {decision === null && t('interactive.answered')}
        </p>
      ) : (
        <>
          <label className="mt-3 flex flex-col gap-1.5">
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
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!canSubmit}
              onClick={() => send(false)}
            >
              {block.reject || t('interactive.reject')}
            </Button>
            <Button
              type="button"
              disabled={!canSubmit}
              onClick={() => send(true)}
            >
              {block.approve || t('interactive.approve')}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
