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

export const CONVERSATION_MESSAGE_ROLES = [
  'user',
  'pm',
  'employee',
  'system'
] as const
export type ConversationMessageRole =
  (typeof CONVERSATION_MESSAGE_ROLES)[number]

export type PhilharmonicSseEvent =
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
  | { type: 'cron_fired'; scheduleTaskId: string; childTaskId: string }
  | {
      type: 'agent_created'
      taskId: string
      agentId: string
      agentName: string
    }
  | {
      type: 'shadow_agent_created'
      taskId: string
      shadowAgentId: string
      originalAgentId: string
    }
  | {
      type: 'task_queued'
      taskId: string
      reason: 'agent_busy' | 'cron_no_shadow'
    }
  | {
      type: 'message_start'
      conversationId: string
      messageId: string
      role: ConversationMessageRole
      agentId?: string
    }
  | {
      type: 'message_delta'
      conversationId: string
      messageId: string
      delta: string
    }
  | {
      type: 'message_end'
      conversationId: string
      messageId: string
    }
  | {
      type: 'tool_card'
      conversationId: string
      messageId: string
      toolName: string
      phase: 'start' | 'end'
      result?: unknown
    }
  | { type: 'member_joined'; conversationId: string; agentId: string }
  | { type: 'round_start'; conversationId: string; label: string }
  | {
      type: 'ask_user'
      conversationId: string
      question: string
      options: string[]
    }
  | { type: 'conversation_error'; conversationId: string; error: string }

export interface AutoRouteResult {
  departmentId: string
  agentId: string
  confidence: number
  reasoning: string
}

export interface AutoFillResult {
  description: string
  mode: 'once' | 'cron'
  cronExpression: string | null
  agentId: string | null
  departmentId: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
}
