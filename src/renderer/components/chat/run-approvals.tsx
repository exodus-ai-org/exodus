import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import { TOOL_NAMES } from '@exodus/shared/constants/tool-names'
import {
  CheckIcon,
  ClockIcon,
  KeyRoundIcon,
  OctagonXIcon,
  SquareIcon
} from 'lucide-react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { StatusStrip } from '@/components/status-strip'
import { Button } from '@/components/ui/button'
import {
  type RunApproval,
  useDecideApproval,
  useRunApprovals
} from '@/hooks/use-approvals'

const ICON = 'size-3.5 shrink-0'

/**
 * The foot of a run whose tool call touched a secret outside Exodus (an SSH
 * key, cloud credentials, a `.env` elsewhere): what it wants to read, with
 * Allow once / Deny — at the foot rather than in the timeline, so it shows
 * even while the timeline is folded. Once settled, one quiet line says how.
 *
 * Subscribes to its own run's approvals only (`useRunApprovals` narrows with
 * `select`), and takes only strings and a boolean, so a streaming frame of
 * this or another run does not re-render it.
 *
 * `active` is whether the run still streams: a call still pending once it
 * does not was cut off by Stop (the server declines it; this client stopped
 * listening before it could say so).
 */
export const RunApprovals = memo(function RunApprovals({
  chatId,
  runId,
  active
}: {
  chatId: string
  runId: string
  active: boolean
}) {
  const approvals = useRunApprovals(chatId, runId)
  if (approvals.length === 0) return null
  return (
    <>
      {approvals.map((approval) => (
        <ApprovalCard
          key={approval.toolCallId}
          chatId={chatId}
          runId={runId}
          approval={approval}
          active={active}
        />
      ))}
    </>
  )
})

function ApprovalCard({
  chatId,
  runId,
  approval,
  active
}: {
  chatId: string
  runId: string
  approval: RunApproval
  active: boolean
}) {
  const { t } = useTranslation('chat')
  const decide = useDecideApproval(chatId)
  const state =
    approval.state === 'pending' && !active ? 'stopped' : approval.state
  const isCommand = approval.toolName === TOOL_NAMES.terminal

  if (state !== 'pending') {
    const settled = {
      allowed: {
        icon: <CheckIcon className={ICON} />,
        label: t('approval.allowed')
      },
      denied: {
        icon: <OctagonXIcon className={ICON} />,
        label: t('approval.denied')
      },
      timed_out: {
        icon: <ClockIcon className={ICON} />,
        label: t('approval.timedOut')
      },
      stopped: {
        icon: <SquareIcon className={ICON} />,
        label: t('approval.stopped')
      },
      expired: {
        icon: <ClockIcon className={ICON} />,
        label: t('approval.expired')
      }
    }[state]
    return (
      <StatusStrip
        role="status"
        data-testid={TEST_IDS.chat.approval.state}
        data-state={state}
        icon={settled.icon}
      >
        <span className="shrink-0">{settled.label}</span>
        <code className="min-w-0 truncate font-mono text-[11px]">
          {approval.summary}
        </code>
      </StatusStrip>
    )
  }

  const answer = (decision: 'allow' | 'deny') =>
    decide.mutate({ runId, toolCallId: approval.toolCallId, decision })

  return (
    <StatusStrip
      role="group"
      aria-label={t('approval.title')}
      data-testid={TEST_IDS.chat.approval.card}
      icon={<KeyRoundIcon className={ICON} />}
      className="text-foreground"
      details={
        <div className="flex flex-col gap-2 pt-2 pl-5.5">
          <p className="text-muted-foreground">
            {isCommand ? t('approval.commandHint') : t('approval.fileHint')}
          </p>
          <code className="bg-muted/60 rounded-md px-2 py-1 font-mono text-[11px] break-all whitespace-pre-wrap">
            {approval.summary}
          </code>
          <div className="flex gap-2">
            <Button
              size="xs"
              data-testid={TEST_IDS.chat.approval.allow}
              disabled={decide.isPending}
              onClick={() => answer('allow')}
            >
              {t('approval.allow')}
            </Button>
            <Button
              size="xs"
              variant="outline"
              data-testid={TEST_IDS.chat.approval.deny}
              disabled={decide.isPending}
              onClick={() => answer('deny')}
            >
              {t('approval.deny')}
            </Button>
          </div>
        </div>
      }
    >
      <span className="font-medium">{t('approval.title')}</span>
    </StatusStrip>
  )
}
