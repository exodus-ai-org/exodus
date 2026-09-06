import { TEST_IDS } from '@shared/constants/test-ids'
import { MonitorIcon, OctagonXIcon } from 'lucide-react'
import { useState } from 'react'
import { sileo } from 'sileo'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { abortComputerUse, answerComputerUse } from '@/services/computer-use'

/**
 * The shape `ComputerUseCard` receives as `toolResult` — `messages-calling-tools`
 * unwraps `details` before passing it in. It is either a live `SessionUpdate`
 * frame streamed via `onUpdate` (`{ step, action?, thumbnail?, awaitingHuman?,
 * sessionId }`) or the terminal result (`{ sessionId, outcome, steps, summary }`).
 * Every field is optional so a half-populated frame renders without guards.
 */
interface ComputerUseDetails {
  step?: number
  action?: string
  thumbnail?: string
  awaitingHuman?: { question: string }
  outcome?: 'success' | 'failed' | 'aborted' | 'abandoned' | 'stuck'
  sessionId?: string
  steps?: number
  summary?: string
  error?: string
}

const OUTCOME_TONE: Record<string, string> = {
  success: 'text-green-500',
  failed: 'text-destructive',
  aborted: 'text-muted-foreground',
  abandoned: 'text-muted-foreground',
  stuck: 'text-yellow-600 dark:text-yellow-400'
}

export function ComputerUseCard({
  toolResult
}: {
  toolResult: ComputerUseDetails | null | undefined
}) {
  const details = toolResult ?? {}
  const [answer, setAnswer] = useState('')
  const running = !details.outcome && !details.error

  const stop = () => {
    abortComputerUse().catch(() => {
      sileo.error({
        title: 'Could not stop the session',
        description: 'The stop request failed — try again.'
      })
    })
  }

  const sendAnswer = () => {
    if (!details.sessionId) return
    answerComputerUse(details.sessionId, answer.trim() || '(done)').catch(
      () => {
        sileo.error({
          title: 'Could not send your answer',
          description: 'The request failed — try again.'
        })
      }
    )
    setAnswer('')
  }

  const headerRight = details.error
    ? 'error'
    : (details.outcome ??
      (typeof details.step === 'number' ? `step ${details.step}` : 'running…'))

  return (
    <div className="overflow-hidden rounded-lg border text-xs">
      {/* Header */}
      <div className="bg-muted/60 flex items-center gap-2 border-b px-3 py-2">
        <MonitorIcon className="text-muted-foreground size-3.5 shrink-0" />
        <span className="text-foreground/80 flex-1 truncate font-medium">
          Computer Use
        </span>
        <span
          className={cn(
            'shrink-0',
            details.outcome
              ? (OUTCOME_TONE[details.outcome] ?? 'text-muted-foreground')
              : 'text-muted-foreground'
          )}
        >
          {headerRight}
        </span>
      </div>

      <div className="flex flex-col gap-2 px-3 py-2">
        {/* Current / last step + action */}
        {typeof details.step === 'number' && (
          <div className="text-foreground/90">
            Step {details.step}
            {details.action ? `: ${details.action}` : ': …'}
          </div>
        )}

        {/* Optional thumbnail of the target window */}
        {details.thumbnail && (
          <div className="bg-muted/40 max-h-40 w-fit overflow-hidden rounded border">
            <img
              src={`data:image/png;base64,${details.thumbnail}`}
              alt={`Target window at step ${details.step ?? '?'}`}
              className="max-h-40 w-auto object-contain"
            />
          </div>
        )}

        {/* Inline askHuman prompt */}
        {details.awaitingHuman && (
          <div className="border-primary/30 bg-primary/5 flex flex-col gap-2 rounded-md border p-2">
            <p className="text-foreground/90">
              {details.awaitingHuman.question}
            </p>
            {details.sessionId ? (
              <div className="flex items-center gap-2">
                <Input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') sendAnswer()
                  }}
                  placeholder="Type a reply, or leave blank when done"
                  className="h-7 flex-1 text-xs"
                />
                <Button
                  size="xs"
                  variant="secondary"
                  data-testid={TEST_IDS.computerUse.continueButton}
                  onClick={sendAnswer}
                >
                  Done — continue
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Waiting for the session to accept a reply…
              </p>
            )}
          </div>
        )}

        {/* Stop control while the session is live */}
        {running && (
          <div>
            <Button
              size="xs"
              variant="destructive"
              data-testid={TEST_IDS.computerUse.stopButton}
              onClick={stop}
            >
              <OctagonXIcon />
              Stop
            </Button>
          </div>
        )}

        {/* Terminal summary */}
        {!running && (
          <>
            {details.summary && (
              <p className="text-foreground/90">{details.summary}</p>
            )}
            {details.error && (
              <p className="text-destructive">{details.error}</p>
            )}
            {details.sessionId && (
              <p className="text-muted-foreground/60 font-mono text-[10px]">
                session: {details.sessionId}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
