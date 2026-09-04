import { useCallback, useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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
    color: 'var(--primary)'
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
    <div className="bg-muted rounded-xl p-3.5">
      <div className="mb-2 flex items-start justify-between">
        <span className="text-muted-foreground text-[11.5px]">{label}</span>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </span>
      </div>
      <div className="text-foreground text-[22px] font-bold tabular-nums">
        {value}
      </div>
      {hint && (
        <div className="text-muted-foreground mt-0.5 text-[11px]">{hint}</div>
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
    <div className="bg-muted rounded-xl p-3.5">
      <div className="text-foreground mb-2 text-[12.5px] font-semibold">
        Cost by employee
      </div>
      {rows.length === 0 ? (
        <div className="text-muted-foreground py-6 text-center text-xs">
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
                className="bg-card flex items-center gap-2.5 rounded-lg px-2 py-2"
              >
                {agent ? (
                  <EmployeeAvatar
                    seed={agent.avatarSeed}
                    style={agent.avatarStyle}
                    size={30}
                  />
                ) : (
                  <div className="bg-background h-[30px] w-[30px] rounded-full" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-foreground truncate text-xs font-semibold">
                    {label}
                  </div>
                  <div className="text-muted-foreground text-[10.5px]">
                    {formatTokens(r.tokens)} tokens
                  </div>
                </div>
                <div className="text-foreground text-xs font-semibold tabular-nums">
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
    <div className="bg-muted rounded-xl p-3.5">
      <div className="text-foreground mb-2 text-[12.5px] font-semibold">
        Cost by conversation
      </div>
      {rows.length === 0 ? (
        <div className="text-muted-foreground py-6 text-center text-xs">
          No conversation usage data yet
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <div
              key={r.conversationId}
              className="bg-card flex items-center gap-2.5 rounded-lg px-2 py-2"
            >
              <div className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-[10.5px]">
                {r.conversationId.slice(0, 12)}…
              </div>
              <div className="text-muted-foreground text-[10.5px] tabular-nums">
                {formatTokens(r.tokens)}
              </div>
              <div className="text-foreground text-xs font-semibold tabular-nums">
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
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
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
      <header className="border-border flex h-13 shrink-0 items-center justify-between border-b px-5">
        <div>
          <h1 className="text-foreground text-sm font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-[11.5px]">{periodLabel}</p>
        </div>
        <ToggleGroup
          value={[period]}
          onValueChange={(v) => {
            const next = (v as string[])[0]
            if (next) setPeriod(next as Period)
          }}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="7d">7d</ToggleGroupItem>
          <ToggleGroupItem value="30d">30d</ToggleGroupItem>
          <ToggleGroupItem value="all">All</ToggleGroupItem>
        </ToggleGroup>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        {/* KPI grid */}
        <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <KpiCard
            label="Total cost"
            value={formatCost(data.totalCost)}
            icon="$"
            iconBg="var(--accent)"
            iconColor="var(--accent-foreground)"
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
          <div className="bg-muted mb-4 rounded-xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-foreground text-[12.5px] font-semibold">
                Cost over time
              </div>
              <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
                <span className="bg-primary inline-block h-2 w-2 rounded-full" />
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
                      stopColor="var(--primary)"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
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
                  stroke="var(--primary)"
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
