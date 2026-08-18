// src/renderer/services/philharmonic-tasks.ts
import { fetcher } from '@shared/utils/http'

import type { TaskData } from '@/stores/philharmonic'

const BASE = '/api/philharmonic'

export const getUpcomingTasks = () =>
  fetcher<TaskData[]>(`${BASE}/tasks/upcoming`)

export const getRecurringTasks = () =>
  fetcher<TaskData[]>(`${BASE}/tasks/recurring`)

export const createScheduledTask = (data: {
  title: string
  description?: string
  conversationId: string
  priority?: TaskData['priority']
  cronExpression?: string | null
  runAt?: string | null
}) =>
  fetcher<TaskData>(`${BASE}/tasks`, { method: 'POST', body: data as never })

export const cancelScheduledTask = (id: string) =>
  fetcher<TaskData>(`${BASE}/tasks/${id}`, {
    method: 'PATCH',
    body: { status: 'cancelled' } as never
  })
