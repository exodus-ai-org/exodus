import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart'
import type { TaskData } from '@/stores/agent-x'

const chartConfig = {
  completed: {
    label: 'Completed',
    color: '#28C840'
  },
  failed: {
    label: 'Failed',
    color: '#FF5F57'
  }
} satisfies ChartConfig

interface ChartAreaInteractiveProps {
  tasks: TaskData[]
}

export function ChartAreaInteractive({ tasks }: ChartAreaInteractiveProps) {
  const chartData = useMemo(() => {
    const buckets = new Map<string, { completed: number; failed: number }>()

    for (const task of tasks) {
      if (task.status !== 'completed' && task.status !== 'failed') continue
      const date = (task.completedAt ?? task.updatedAt ?? task.createdAt)
        .toString()
        .slice(0, 10)
      if (!buckets.has(date)) buckets.set(date, { completed: 0, failed: 0 })
      const bucket = buckets.get(date)!
      if (task.status === 'completed') bucket.completed++
      else bucket.failed++
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }))
  }, [tasks])

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Execution Trend</CardTitle>
          <CardDescription>Completed vs failed tasks over time</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[250px] items-center justify-center">
          <p className="text-muted-foreground text-sm">
            No completed tasks yet. Dispatch a task to see trends.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Task Execution Trend</CardTitle>
        <CardDescription>Completed vs failed tasks over time</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#28C840" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#28C840" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillFailed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF5F57" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#FF5F57" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })
                  }
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="failed"
              type="natural"
              fill="url(#fillFailed)"
              stroke="#FF5F57"
              stackId="a"
            />
            <Area
              dataKey="completed"
              type="natural"
              fill="url(#fillCompleted)"
              stroke="#28C840"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
