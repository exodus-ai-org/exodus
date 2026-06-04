import { useCallback, useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { getAgents } from '@/services/philharmonic'
import {
  getPhilharmonicCosts,
  type PhilharmonicCostSummary
} from '@/services/philharmonic-chat'
import type { AgentData } from '@/stores/philharmonic'

import { EmployeeAvatar } from './employees/employee-avatar'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCost(usd: number) {
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  if (usd < 1) return `$${usd.toFixed(3)}`
  return `$${usd.toFixed(2)}`
}

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

// ─── Chart config ────────────────────────────────────────────────────────────

const chartConfig = {
  cost: {
    label: 'Cost',
    color: 'var(--ph-primary)'
  }
} satisfies ChartConfig

// ─── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  hint
}: {
  label: string
  value: string
  icon: string
  iconBg: string
  iconColor: string
  hint?: string
}) {
  return (
    <div
      className="rounded-[var(--ph-radius-lg)] p-3.5"
      style={{ background: 'var(--ph-surface-sunken)' }}
    >
      <div className="mb-2 flex items-start justify-between">
        <span className="text-[11.5px] text-[var(--ph-text-muted)]">
          {label}
        </span>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-[var(--ph-radius-md)] text-sm"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </span>
      </div>
      <div className="text-[22px] font-bold text-[var(--ph-text)] tabular-nums">
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 text-[11px] text-[var(--ph-text-muted)]">
          {hint}
        </div>
      )}
    </div>
  )
}

// ─── Employee cost row ───────────────────────────────────────────────────────

function AgentCostList({
  rows,
  agentsById
}: {
  rows: PhilharmonicCostSummary['byAgent']
  agentsById: Record<string, AgentData>
}) {
  return (
    <div
      className="rounded-[var(--ph-radius-lg)] p-3.5"
      style={{ background: 'var(--ph-surface-sunken)' }}
    >
      <div className="mb-2 text-[12.5px] font-semibold text-[var(--ph-text)]">
        Cost by employee
      </div>
      {rows.length === 0 ? (
        <div className="py-6 text-center text-xs text-[var(--ph-text-muted)]">
          No employee usage data yet
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {rows.map((r) => {
            const agent = agentsById[r.agentId]
            const label = agent ? agent.name : `${r.agentId.slice(0, 8)}…`
            return (
              <div
                key={r.agentId}
                className="flex items-center gap-2.5 rounded-[var(--ph-radius-md)] px-2 py-2"
                style={{ background: 'var(--ph-surface)' }}
              >
                {agent ? (
                  <EmployeeAvatar
                    seed={agent.avatarSeed}
                    style={agent.avatarStyle}
                    size={30}
                  />
                ) : (
                  <div
                    className="h-[30px] w-[30px] rounded-full"
                    style={{ background: 'var(--ph-canvas)' }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-[var(--ph-text)]">
                    {label}
                  </div>
                  <div className="text-[10.5px] text-[var(--ph-text-muted)]">
                    {formatTokens(r.tokens)} tokens
                  </div>
                </div>
                <div className="text-xs font-semibold text-[var(--ph-text)] tabular-nums">
                  {formatCost(r.cost)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ConversationCostList({
  rows
}: {
  rows: PhilharmonicCostSummary['byConversation']
}) {
  return (
    <div
      className="rounded-[var(--ph-radius-lg)] p-3.5"
      style={{ background: 'var(--ph-surface-sunken)' }}
    >
      <div className="mb-2 text-[12.5px] font-semibold text-[var(--ph-text)]">
        Cost by conversation
      </div>
      {rows.length === 0 ? (
        <div className="py-6 text-center text-xs text-[var(--ph-text-muted)]">
          No conversation usage data yet
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <div
              key={r.conversationId}
              className="flex items-center gap-2.5 rounded-[var(--ph-radius-md)] px-2 py-2"
              style={{ background: 'var(--ph-surface)' }}
            >
              <div className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-[var(--ph-text-muted)]">
                {r.conversationId.slice(0, 12)}…
              </div>
              <div className="text-[10.5px] text-[var(--ph-text-muted)] tabular-nums">
                {formatTokens(r.tokens)}
              </div>
              <div className="text-xs font-semibold text-[var(--ph-text)] tabular-nums">
                {formatCost(r.cost)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

type Period = '7d' | '30d' | 'all'

export function CostAnalysis() {
  const [data, setData] = useState<PhilharmonicCostSummary | null>(null)
  const [agentsById, setAgentsById] = useState<Record<string, AgentData>>({})
  const [period, setPeriod] = useState<Period>('all')

  const load = useCallback(async () => {
    const [costs, agents] = await Promise.all([
      getPhilharmonicCosts(),
      getAgents()
    ])
    setData(costs)
    setAgentsById(Object.fromEntries(agents.map((a) => [a.id, a])))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--ph-text-muted)]">
        Loading usage data…
      </div>
    )
  }

  const agentCount = data.byAgent.length
  const periodLabel =
    period === '7d'
      ? 'Last 7 days'
      : period === '30d'
        ? 'Last 30 days'
        : 'All time'

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--ph-border)] px-5">
        <div>
          <h1 className="text-sm font-semibold text-[var(--ph-text)]">
            Dashboard
          </h1>
          <p className="text-[11.5px] text-[var(--ph-text-muted)]">
            {periodLabel}
          </p>
        </div>
        <div
          className="flex rounded-[var(--ph-radius-md)] p-0.5"
          style={{ background: 'var(--ph-canvas)' }}
        >
          {(['7d', '30d', 'all'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                'rounded-[var(--ph-radius-sm)] px-3 py-1 text-xs font-medium transition-all'
              )}
              style={
                period === p
                  ? {
                      background: 'var(--ph-surface)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      color: 'var(--ph-text)'
                    }
                  : { color: 'var(--ph-text-muted)' }
              }
            >
              {p === 'all' ? 'All' : p}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        {/* KPI grid */}
        <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <KpiCard
            label="Total cost"
            value={formatCost(data.totalCost)}
            icon="$"
            iconBg="var(--ph-primary-soft)"
            iconColor="var(--ph-primary-ink)"
            hint={`Across ${agentCount} employee${agentCount === 1 ? '' : 's'}`}
          />
          <KpiCard
            label="Tokens"
            value={formatTokens(data.totalTokens)}
            icon="⚡"
            iconBg="var(--ph-hue-lilac-fill)"
            iconColor="var(--ph-hue-lilac-ring)"
            hint="Total processed"
          />
          <KpiCard
            label="Employees"
            value={agentCount.toLocaleString()}
            icon="👥"
            iconBg="var(--ph-hue-sky-fill)"
            iconColor="var(--ph-hue-sky-ring)"
            hint="With recorded usage"
          />
          <KpiCard
            label="Conversations"
            value={data.byConversation.length.toLocaleString()}
            icon="💬"
            iconBg="var(--ph-hue-peach-fill)"
            iconColor="var(--ph-hue-peach-ring)"
            hint="With activity"
          />
        </div>

        {/* Daily chart */}
        {data.daily.length > 1 && (
          <div
            className="mb-4 rounded-[var(--ph-radius-lg)] p-4"
            style={{ background: 'var(--ph-surface-sunken)' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[12.5px] font-semibold text-[var(--ph-text)]">
                Cost over time
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[var(--ph-text-muted)]">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: 'var(--ph-primary)' }}
                />
                Cost
              </div>
            </div>
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[200px] w-full"
            >
              <AreaChart data={data.daily}>
                <defs>
                  <linearGradient id="ph-cost-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--ph-primary)"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--ph-primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--ph-border)" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(v: string) => v.slice(5)}
                  style={{ fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                  width={56}
                  style={{ fontSize: 11 }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(v) => v}
                      indicator="dot"
                    />
                  }
                />
                <Area
                  dataKey="cost"
                  type="natural"
                  fill="url(#ph-cost-fill)"
                  stroke="var(--ph-primary)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        )}

        {/* Breakdown lists */}
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          <AgentCostList rows={data.byAgent} agentsById={agentsById} />
          <ConversationCostList rows={data.byConversation} />
        </div>
      </div>
    </div>
  )
}
