import type { AutoFillResult, AutoRouteResult } from '@shared/types/agent-x'
import { fetcher } from '@shared/utils/http'

import type { AgentData, DepartmentData, TaskData } from '@/stores/agent-x'

const BASE = '/api/agent-x'

// ─── Departments ────────────────────────────────────────────────────────────

export const getDepartments = () =>
  fetcher<DepartmentData[]>(`${BASE}/departments`)

export const createDepartment = (
  data: Partial<Omit<DepartmentData, 'id' | 'createdAt' | 'updatedAt'>>
) =>
  fetcher<DepartmentData>(`${BASE}/departments`, {
    method: 'POST',
    body: data as never
  })

export const updateDepartment = (id: string, data: Partial<DepartmentData>) =>
  fetcher<DepartmentData>(`${BASE}/departments/${id}`, {
    method: 'PUT',
    body: data as never
  })

export const deleteDepartment = (id: string) =>
  fetcher<void>(`${BASE}/departments/${id}`, {
    method: 'DELETE',
    responseType: 'text'
  })

// ─── Agents ─────────────────────────────────────────────────────────────────

export const getAgents = () => fetcher<AgentData[]>(`${BASE}/agents`)

export const createAgentApi = (
  data: Partial<Omit<AgentData, 'id' | 'createdAt' | 'updatedAt'>>
) =>
  fetcher<AgentData>(`${BASE}/agents`, { method: 'POST', body: data as never })

export const updateAgentApi = (id: string, data: Partial<AgentData>) =>
  fetcher<AgentData>(`${BASE}/agents/${id}`, {
    method: 'PUT',
    body: data as never
  })

export const deleteAgentApi = (id: string) =>
  fetcher<void>(`${BASE}/agents/${id}`, {
    method: 'DELETE',
    responseType: 'text'
  })

// ─── Tasks ──────────────────────────────────────────────────────────────────

export const getTasks = () => fetcher<TaskData[]>(`${BASE}/tasks`)

export const getTask = (id: string) =>
  fetcher<TaskData & { executions: unknown[] }>(`${BASE}/tasks/${id}`)

export const getChildTasks = (id: string) =>
  fetcher<Array<TaskData & { executionCount: number; totalTokens: number }>>(
    `${BASE}/tasks/${id}/children`
  )

export const createTaskApi = (data: {
  title: string
  description?: string
  priority?: string
  assignedAgentId?: string | null
  assignedDepartmentId?: string | null
  input?: Record<string, unknown> | null
  cronExpression?: string | null
}) =>
  fetcher<TaskData>(`${BASE}/tasks`, { method: 'POST', body: data as never })

export const updateTaskApi = (id: string, data: Record<string, unknown>) =>
  fetcher<TaskData>(`${BASE}/tasks/${id}`, {
    method: 'PUT',
    body: data as never
  })

export const restoreTaskApi = (id: string) =>
  fetcher<TaskData>(`${BASE}/tasks/${id}`, {
    method: 'PUT',
    body: { _action: 'restore' } as never
  })

export const editTaskApi = (
  id: string,
  data: {
    title?: string
    description?: string
    priority?: string
    assignedAgentId?: string | null
    assignedDepartmentId?: string | null
    cronExpression?: string | null
  }
) =>
  fetcher<TaskData>(`${BASE}/tasks/${id}`, {
    method: 'PUT',
    body: { ...data, _action: 'edit' } as never
  })

export const submitTaskFeedback = (
  id: string,
  feedback: { rating: 'positive' | 'negative'; note?: string }
) =>
  fetcher<TaskData>(`${BASE}/tasks/${id}`, {
    method: 'PUT',
    body: {
      feedbackRating: feedback.rating,
      feedbackNote: feedback.note ?? null
    } as never
  })

export const respondToEscalation = (taskId: string, response: string) =>
  fetcher<{ success: boolean }>(`${BASE}/tasks/${taskId}/respond`, {
    method: 'POST',
    body: { response } as never
  })

// ─── Available Skills ────────────────────────────────────────────────────────

export const getAvailableSkills = () =>
  fetcher<Array<{ slug: string; name: string; isActive: boolean }>>(
    `${BASE}/available-skills`
  )

// MCP Server APIs moved to mcp-service.ts

// ─── Auto-Route ─────────────────────────────────────────────────────────────

export const autoRoute = (description: string) =>
  fetcher<AutoRouteResult | null>(`${BASE}/auto-route`, {
    method: 'POST',
    body: { description } as never
  })

export const autoFill = (title: string) =>
  fetcher<AutoFillResult | null>(`${BASE}/auto-fill`, {
    method: 'POST',
    body: { title } as never
  })

// ─── Positions ──────────────────────────────────────────────────────────────

export const batchUpdatePositionsApi = (
  updates: Array<{
    type: 'department' | 'agent'
    id: string
    position: { x: number; y: number }
  }>
) =>
  fetcher<{ success: boolean }>(`${BASE}/positions`, {
    method: 'PATCH',
    body: { updates } as never
  })
