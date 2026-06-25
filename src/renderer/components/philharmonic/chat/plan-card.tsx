// src/renderer/components/philharmonic/chat/plan-card.tsx
import type { PlanDto, StepStatus } from '@shared/types/philharmonic'
import { Check, ChevronDown, ChevronRight, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'
import type { AgentData } from '@/stores/philharmonic'

import { EmployeeAvatar } from '../employees/employee-avatar'

interface Props {
  plan: PlanDto
  agentsById: Record<string, AgentData>
}

const STATUS_GLYPH: Record<StepStatus, string> = {
  pending: '○',
  running: '⏳',
  done: '✓',
  skipped: '⊘',
  failed: '✗'
}

const STATUS_COLOR: Record<StepStatus, string> = {
  pending: 'var(--ph-text-muted)',
  running: 'var(--ph-warning)',
  done: 'var(--ph-primary)',
  skipped: 'var(--ph-text-muted)',
  failed: 'var(--ph-danger)'
}

function elapsedLabel(plan: PlanDto): string {
  const start = new Date(plan.createdAt).getTime()
  const end =
    plan.status === 'completed' || plan.status === 'aborted'
      ? new Date(plan.updatedAt).getTime()
      : Date.now()
  const min = Math.floor((end - start) / 60_000)
  if (min < 1) return '<1 min'
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)}h ${min % 60}m`
}

export function PlanCard({ plan, agentsById }: Props) {
  // Auto-collapse completed plans and busy plans with > 4 steps.
  const initialCollapsed =
    plan.status === 'completed' ||
    plan.status === 'aborted' ||
    plan.steps.length > 4
  const [collapsed, setCollapsed] = useState(initialCollapsed)

  // Tick once a minute so elapsed labels stay fresh without an animation loop.
  const [, force] = useState(0)
  useEffect(() => {
    if (plan.status !== 'active') return
    const t = setInterval(() => force((n) => n + 1), 60_000)
    return () => clearInterval(t)
  }, [plan.status])

  if (plan.steps.length === 0) return null

  const done = plan.steps.filter((s) => s.status === 'done').length
  const total = plan.steps.length

  return (
    <div
      className="mb-4 overflow-hidden rounded-[var(--ph-radius-lg)]"
      style={{ background: 'var(--ph-surface-sunken)' }}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-[var(--ph-canvas)]"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-[var(--ph-text-muted)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[var(--ph-text-muted)]" />
        )}
        <span className="flex-1 truncate text-[12.5px] font-semibold text-[var(--ph-text)]">
          {plan.summary}
        </span>
        <span className="text-[11px] text-[var(--ph-text-muted)]">
          {done}/{total} · {elapsedLabel(plan)}
        </span>
        <StatusPill status={plan.status} />
      </button>
      {!collapsed && (
        <div className="border-t border-[var(--ph-border)]">
          {plan.steps.map((s) => {
            const agent = s.assignedAgentId
              ? agentsById[s.assignedAgentId]
              : undefined
            return (
              <div
                key={s.id}
                className={cn(
                  'flex items-start gap-3 px-4 py-2.5',
                  s.status === 'running' && 'bg-[var(--ph-canvas)]'
                )}
              >
                <span
                  className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center text-[12px]"
                  style={{ color: STATUS_COLOR[s.status] }}
                  aria-label={s.status}
                >
                  {s.status === 'done' ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : s.status === 'failed' ? (
                    <X className="h-3.5 w-3.5" />
                  ) : (
                    STATUS_GLYPH[s.status]
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      'text-[13px] font-medium',
                      s.status === 'done' &&
                        'text-[var(--ph-text-muted)] line-through',
                      s.status === 'skipped' && 'text-[var(--ph-text-muted)]'
                    )}
                    style={
                      s.status !== 'done' && s.status !== 'skipped'
                        ? { color: 'var(--ph-text)' }
                        : undefined
                    }
                  >
                    {s.ordinal + 1}. {s.title}
                  </div>
                  {s.intent && (
                    <div className="text-[11.5px] text-[var(--ph-text-muted)]">
                      {s.intent}
                    </div>
                  )}
                  {s.output && s.status === 'done' && (
                    <div className="mt-1 line-clamp-2 text-[11.5px] text-[var(--ph-text-muted)]">
                      → {s.output}
                    </div>
                  )}
                  {s.note && (
                    <div className="mt-1 text-[11.5px] text-[var(--ph-warning)]">
                      {s.note}
                    </div>
                  )}
                </div>
                {agent && (
                  <EmployeeAvatar
                    seed={agent.avatarSeed}
                    style={agent.avatarStyle}
                    size={24}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: PlanDto['status'] }) {
  const label =
    status === 'active'
      ? 'active'
      : status === 'completed'
        ? 'done'
        : status === 'aborted'
          ? 'aborted'
          : 'draft'
  const color =
    status === 'completed'
      ? 'var(--ph-primary)'
      : status === 'aborted'
        ? 'var(--ph-danger)'
        : 'var(--ph-warning)'
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{
        background: 'var(--ph-canvas)',
        color
      }}
    >
      {label}
    </span>
  )
}
