import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'

/**
 * Creates the `delegateTask` tool that allows an agent to delegate work to another agent.
 * The actual execution is injected via the `onDelegate` callback.
 */
export function createDelegateTaskTool(
  availableAgents: Array<{
    id: string
    name: string
    description: string | null
  }>,
  onDelegate: (params: {
    targetAgentId: string
    taskDescription: string
  }) => Promise<string>
): AgentTool {
  const agentList = availableAgents
    .map(
      (a) => `- ${a.name} (id: ${a.id}): ${a.description ?? 'No description'}`
    )
    .join('\n')

  const schema = Type.Object({
    targetAgentId: Type.String({
      description: 'The ID of the agent to delegate to'
    }),
    taskDescription: Type.String({
      description: 'Clear description of what the target agent should do'
    })
  })

  return {
    name: 'delegateTask',
    label: 'Delegate Task',
    description: `Delegate a sub-task to another agent. Use this when the task requires expertise from a different agent. Available agents:\n${agentList}`,
    parameters: schema,
    execute: async (
      _toolCallId: string,
      params: { targetAgentId: string; taskDescription: string }
    ) => {
      const result = await onDelegate(params)
      return {
        content: [{ type: 'text' as const, text: result }],
        details: { delegatedTo: params.targetAgentId, result }
      }
    }
  } as AgentTool
}

/**
 * Creates the `escalateToUser` tool that allows an agent to pause and ask the user for input.
 */
export function createEscalateToUserTool(
  onEscalate: (params: {
    question: string
    options: string[]
  }) => Promise<string>
): AgentTool {
  const schema = Type.Object({
    question: Type.String({
      description: 'The question to ask the user'
    }),
    options: Type.Array(Type.String(), {
      description:
        'Optional predefined answer options for the user to choose from',
      default: []
    })
  })

  return {
    name: 'escalateToUser',
    label: 'Escalate to User',
    description:
      'Escalate to the user when you encounter a blocker, need clarification, or need approval to proceed. Provide a clear question and optional predefined options.',
    parameters: schema,
    execute: async (
      _toolCallId: string,
      params: { question: string; options: string[] }
    ) => {
      const response = await onEscalate(params)
      return {
        content: [
          { type: 'text' as const, text: `User responded: ${response}` }
        ],
        details: { question: params.question, response }
      }
    }
  } as AgentTool
}
