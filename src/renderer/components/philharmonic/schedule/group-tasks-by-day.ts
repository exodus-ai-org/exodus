import { format } from 'date-fns'

import type { TaskData } from '@/stores/philharmonic'

export interface TaskDayGroup {
  day: Date
  label: string
  tasks: TaskData[]
}

/**
 * Groups one-off tasks by the calendar day of their `runAt`. Tasks without
 * `runAt` are dropped. Assumes `tasks` is already sorted by `runAt` ascending
 * (true for `getUpcomingTasks()`'s response) — groups come out in that order.
 */
export function groupTasksByDay(tasks: TaskData[]): TaskDayGroup[] {
  const groups: TaskDayGroup[] = []
  for (const t of tasks) {
    if (!t.runAt) continue
    const day = new Date(t.runAt)
    // Compare UTC dates by converting to ISO date string (YYYY-MM-DD)
    const dayString = day.toISOString().split('T')[0]
    const existing = groups.find((g) => {
      const groupDayString = g.day.toISOString().split('T')[0]
      return groupDayString === dayString
    })
    if (existing) {
      existing.tasks.push(t)
    } else {
      groups.push({ day, label: format(day, 'EEE, MMM d'), tasks: [t] })
    }
  }
  return groups
}
