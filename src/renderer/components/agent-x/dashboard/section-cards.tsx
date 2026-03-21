import { TrendingDownIcon, TrendingUpIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'

interface SectionCardsProps {
  totalTasks: number
  activeDepartments: number
  activeAgents: number
  runningTasks: number
  completedTasks: number
  failedTasks: number
}

export function SectionCards({
  totalTasks,
  activeDepartments,
  activeAgents,
  runningTasks,
  completedTasks,
  failedTasks
}: SectionCardsProps) {
  const completedPercentage =
    totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : '0.0'

  const successRate =
    completedTasks + failedTasks > 0
      ? (completedTasks / (completedTasks + failedTasks)) * 100
      : 0
  const successRateDisplay = successRate.toFixed(1)
  const isSuccessRateHigh = successRate >= 80

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Tasks</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalTasks.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon />
              {completedPercentage}% completed
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {completedTasks.toLocaleString()} completed,{' '}
            {failedTasks.toLocaleString()} failed
          </div>
          <div className="text-muted-foreground">
            Across all departments and agents
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Agents</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {activeAgents.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon />
              {activeDepartments} dept{activeDepartments !== 1 ? 's' : ''}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Spread across {activeDepartments} department
            {activeDepartments !== 1 ? 's' : ''}
          </div>
          <div className="text-muted-foreground">
            Currently active and processing
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Running</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {runningTasks.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              style={{ color: '#FEBC2E' }}
              className="animate-pulse"
            >
              In Progress
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {runningTasks} task{runningTasks !== 1 ? 's' : ''} currently
            executing
          </div>
          <div className="text-muted-foreground">
            Real-time task execution status
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Success Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {successRateDisplay}%
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isSuccessRateHigh ? <TrendingUpIcon /> : <TrendingDownIcon />}
              {isSuccessRateHigh ? 'Healthy' : 'Needs attention'}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isSuccessRateHigh ? 'Strong reliability' : 'Review failed tasks'}{' '}
            {isSuccessRateHigh ? (
              <TrendingUpIcon className="size-4" />
            ) : (
              <TrendingDownIcon className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            Based on {(completedTasks + failedTasks).toLocaleString()} resolved
            tasks
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
