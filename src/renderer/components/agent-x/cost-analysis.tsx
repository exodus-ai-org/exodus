import { CoinsIcon, CpuIcon, TrendingUpIcon, UsersIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart'
import { getAgents } from '@/services/agent-x'
import { getAgentXCosts, type AgentXCostSummary } from '@/services/agent-x-chat'
import type { AgentData } from '@/stores/agent-x'

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
    color: 'var(--color-primary)'
  }
} satisfies ChartConfig

// ─── Agent cost table ─────────────────────────────────────────────────────────

function AgentCostTable({
  rows,
  agentsById
}: {
  rows: AgentXCostSummary['byAgent']
  agentsById: Record<string, AgentData>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost by Employee</CardTitle>
        <CardDescription>
          Breakdown of spending per virtual employee
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="pb-2 font-medium">Employee</th>
                <th className="pb-2 text-right font-medium">Tokens</th>
                <th className="pb-2 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const agent = agentsById[r.agentId]
                const label = agent ? agent.name : r.agentId.slice(0, 8) + '…'
                return (
                  <tr key={r.agentId} className="border-b last:border-0">
                    <td className="py-2 font-medium">{label}</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatTokens(r.tokens)}
                    </td>
                    <td className="py-2 text-right font-medium tabular-nums">
                      {formatCost(r.cost)}
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="text-muted-foreground py-6 text-center"
                  >
                    No agent usage data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Conversation cost table ──────────────────────────────────────────────────

function ConversationCostTable({
  rows
}: {
  rows: AgentXCostSummary['byConversation']
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost by Conversation</CardTitle>
        <CardDescription>Breakdown of spending per work group</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="pb-2 font-medium">Conversation</th>
                <th className="pb-2 text-right font-medium">Tokens</th>
                <th className="pb-2 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.conversationId} className="border-b last:border-0">
                  <td className="text-muted-foreground py-2 font-mono text-xs">
                    {r.conversationId.slice(0, 8)}…
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatTokens(r.tokens)}
                  </td>
                  <td className="py-2 text-right font-medium tabular-nums">
                    {formatCost(r.cost)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="text-muted-foreground py-6 text-center"
                  >
                    No conversation usage data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function CostAnalysis() {
  const [data, setData] = useState<AgentXCostSummary | null>(null)
  const [agentsById, setAgentsById] = useState<Record<string, AgentData>>({})

  const load = useCallback(async () => {
    const [costs, agents] = await Promise.all([getAgentXCosts(), getAgents()])
    setData(costs)
    setAgentsById(Object.fromEntries(agents.map((a) => [a.id, a])))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
        Loading usage data…
      </div>
    )
  }

  const agentCount = data.byAgent.length

  return (
    <div className="flex flex-1 flex-col gap-4 py-4">
      {/* Summary cards */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Cost</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatCost(data.totalCost)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <CoinsIcon className="h-3 w-3" />
                All time
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Across {agentCount} employee{agentCount !== 1 ? 's' : ''}
            </div>
            <div className="text-muted-foreground">
              Aggregated from all work groups
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Tokens</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatTokens(data.totalTokens)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <CpuIcon className="h-3 w-3" />
                Processed
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Across all agent executions
            </div>
            <div className="text-muted-foreground">
              PM coordinator + employees
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Active Employees</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {agentCount.toLocaleString()}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <UsersIcon className="h-3 w-3" />
                With spend
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Employees with recorded usage
            </div>
            <div className="text-muted-foreground">
              Each ran at least one task
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Work Groups</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {data.byConversation.length.toLocaleString()}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUpIcon className="h-3 w-3" />
                Conversations
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Conversations with agent activity
            </div>
            <div className="text-muted-foreground">
              Includes delegated tasks
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Daily cost chart */}
      {data.daily.length > 1 && (
        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Cost</CardTitle>
              <CardDescription>Spending trend over time (USD)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[250px] w-full"
              >
                <AreaChart data={data.daily}>
                  <defs>
                    <linearGradient id="fillCost" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-primary)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-primary)"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                    width={60}
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
                    fill="url(#fillCost)"
                    stroke="var(--color-primary)"
                    stackId="a"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Breakdown tables */}
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @2xl/main:grid-cols-2">
        <AgentCostTable rows={data.byAgent} agentsById={agentsById} />
        <ConversationCostTable rows={data.byConversation} />
      </div>
    </div>
  )
}
