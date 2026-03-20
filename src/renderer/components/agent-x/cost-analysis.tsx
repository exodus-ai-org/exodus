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
import type { ModelCost, UsageSummary } from '@/services/usage'
import { getUsageSummary } from '@/services/usage'
import { CoinsIcon, CpuIcon, HashIcon, TrendingUpIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

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

// ─── Model table ─────────────────────────────────────────────────────────────

function ModelTable({ models }: { models: ModelCost[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost by Model</CardTitle>
        <CardDescription>
          Breakdown of spending across all models
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="pb-2 font-medium">Model</th>
                <th className="pb-2 font-medium">Provider</th>
                <th className="pb-2 text-right font-medium">Requests</th>
                <th className="pb-2 text-right font-medium">Input</th>
                <th className="pb-2 text-right font-medium">Output</th>
                <th className="pb-2 text-right font-medium">Cache</th>
                <th className="pb-2 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.model} className="border-b last:border-0">
                  <td className="py-2 font-medium">{m.model}</td>
                  <td className="text-muted-foreground py-2">{m.provider}</td>
                  <td className="py-2 text-right tabular-nums">
                    {m.requests.toLocaleString()}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatTokens(m.inputTokens)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatTokens(m.outputTokens)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatTokens(m.cacheReadTokens)}
                  </td>
                  <td className="py-2 text-right font-medium tabular-nums">
                    {formatCost(m.cost)}
                  </td>
                </tr>
              ))}
              {models.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="text-muted-foreground py-6 text-center"
                  >
                    No usage data yet
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
  const [data, setData] = useState<UsageSummary | null>(null)

  const load = useCallback(async () => {
    const result = await getUsageSummary()
    setData(result)
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

  const avgCostPerRequest =
    data.totalRequests > 0 ? data.totalCost / data.totalRequests : 0

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
              Across {data.models.length} model
              {data.models.length !== 1 ? 's' : ''}
            </div>
            <div className="text-muted-foreground">
              Aggregated from all conversations
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
              Input + output + cache tokens
            </div>
            <div className="text-muted-foreground">
              Across all assistant responses
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Requests</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {data.totalRequests.toLocaleString()}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <HashIcon className="h-3 w-3" />
                Responses
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Assistant message count
            </div>
            <div className="text-muted-foreground">
              Each with recorded usage data
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Avg Cost / Request</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatCost(avgCostPerRequest)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUpIcon className="h-3 w-3" />
                Per call
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Average cost per LLM call
            </div>
            <div className="text-muted-foreground">
              Helps track efficiency over time
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

      {/* Model breakdown table */}
      <div className="px-4 lg:px-6">
        <ModelTable models={data.models} />
      </div>
    </div>
  )
}
