import type { AgentXSseEvent } from '@shared/types/agent-x'
import { atom } from 'jotai'

export interface DepartmentData {
  id: string
  name: string
  description: string | null
  icon: string | null
  skillSlugs: string[] | null
  mcpServerNames: string[] | null
  position: { x: number; y: number } | null
  createdAt: string
  updatedAt: string
}

export interface AgentData {
  id: string
  departmentId: string | null
  name: string
  description: string | null
  systemPrompt: string | null
  toolAllowList: string[] | null
  skillSlugs: string[] | null
  mcpServerNames: string[] | null
  model: string | null
  provider: string | null
  collaboratorIds: string[] | null
  position: { x: number; y: number } | null
  isActive: boolean | null
  isShadow: boolean | null
  shadowOfAgentId: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskData {
  id: string
  parentTaskId: string | null
  title: string
  description: string | null
  status: string
  priority: string
  assignedDepartmentId: string | null
  assignedAgentId: string | null
  input: Record<string, unknown> | null
  output: Record<string, unknown> | null
  cronExpression: string | null
  lastRunAt: string | null
  lastRunStatus: 'completed' | 'failed' | null
  feedbackRating: 'positive' | 'negative' | null
  feedbackNote: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

// Selected node in the graph
export const selectedNodeAtom = atom<{
  type: 'department' | 'agent'
  id: string
} | null>(null)

// SSE events for live updates
export const agentXEventsAtom = atom<AgentXSseEvent[]>([])

// Panel visibility
export const isConfigPanelOpenAtom = atom(false)

// Task dispatch dialog
export const isTaskDispatchDialogOpenAtom = atom(false)
