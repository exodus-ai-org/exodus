export enum TaskStatus {
  Pending = 'pending',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
  WaitingForUser = 'waiting_for_user'
}

export enum TaskPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Urgent = 'urgent'
}

export enum ExecutionStatus {
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed'
}

export type AgentXSseEvent =
  | { type: 'task_status'; taskId: string; status: TaskStatus }
  | { type: 'agent_start'; taskId: string; agentId: string; agentName: string }
  | {
      type: 'message_update'
      taskId: string
      agentId: string
      content: string
    }
  | {
      type: 'tool_start'
      taskId: string
      agentId: string
      toolName: string
    }
  | {
      type: 'tool_end'
      taskId: string
      agentId: string
      toolName: string
      result: unknown
    }
  | {
      type: 'delegation_start'
      taskId: string
      childTaskId: string
      childAgentId: string
    }
  | { type: 'delegation_end'; childTaskId: string; result: unknown }
  | {
      type: 'escalation'
      taskId: string
      question: string
      options: string[]
    }
  | { type: 'task_completed'; taskId: string; output: unknown }
  | { type: 'task_failed'; taskId: string; error: string }

export interface AutoRouteResult {
  departmentId: string
  agentId: string
  confidence: number
  reasoning: string
}
