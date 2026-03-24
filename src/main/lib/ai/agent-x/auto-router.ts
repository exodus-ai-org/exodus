import { completeSimple } from '@mariozechner/pi-ai'
import type { AutoRouteResult } from '@shared/types/agent-x'

import { getAllAgents, getAllDepartments } from '../../db/agent-x-queries'
import { getSettings } from '../../db/queries'
import { getModelFromProvider } from '../utils/chat-message-util'

const autoRoutePrompt = `You are a task router for a multi-agent system. Given a task description and a list of available departments and agents, suggest the best agent to handle the task.

Respond with ONLY a JSON object in this exact format (no markdown, no code block):
{"departmentId":"...","agentId":"...","confidence":0.0,"reasoning":"..."}

- confidence should be between 0 and 1
- reasoning should be a brief explanation (one sentence)
- If no agent is a good fit, set confidence below 0.3 and pick the closest match`

export async function autoRouteTask(
  taskDescription: string
): Promise<AutoRouteResult | null> {
  const [departments, agents, setting] = await Promise.all([
    getAllDepartments(),
    getAllAgents(),
    getSettings()
  ])

  if (agents.length === 0) return null

  const { chatModel, apiKey } = getModelFromProvider(setting)

  const agentList = agents
    .filter((a) => a.isActive)
    .map((a) => {
      const dept = departments.find((d) => d.id === a.departmentId)
      return `- Agent "${a.name}" (id: ${a.id}, department: "${dept?.name ?? 'unknown'}", departmentId: ${a.departmentId}): ${a.description ?? 'No description'}`
    })
    .join('\n')

  const result = await completeSimple(
    chatModel,
    {
      systemPrompt: autoRoutePrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Task: ${taskDescription}\n\nAvailable agents:\n${agentList}`
            }
          ],
          timestamp: Date.now()
        }
      ]
    },
    { apiKey }
  )

  const text = result.content
    .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
    .map((c) => c.text)
    .join('')

  try {
    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0]) as AutoRouteResult
  } catch {
    console.error('Failed to parse auto-route response:', text)
    return null
  }
}
