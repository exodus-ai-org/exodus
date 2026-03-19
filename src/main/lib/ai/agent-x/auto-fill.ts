import { completeSimple } from '@mariozechner/pi-ai'
import type { AutoFillResult } from '@shared/types/agent-x'
import { getAllAgents, getAllDepartments } from '../../db/agent-x-queries'
import { getSetting } from '../../db/queries'
import { getModelFromProvider } from '../utils/chat-message-util'

const autoFillPrompt = `You are a task planner for a multi-agent system. Given a task title, generate the best configuration.

Respond with ONLY a JSON object in this exact format (no markdown, no code block):
{"description":"...","mode":"once","cronExpression":null,"agentId":"...","departmentId":"...","priority":"medium"}

Rules:
- description: 2-4 sentences expanding the title into clear, actionable instructions for the agent
- mode: "once" for one-time tasks; "cron" for tasks that should repeat on a schedule
- cronExpression: null if mode is "once"; a valid cron expression if mode is "cron" (e.g. "0 9 * * 1-5" for weekdays at 9 AM)
- agentId / departmentId: pick the best-fit agent from the available list; set both to null if no good match (confidence < 0.3)
- priority: "low" for background/non-urgent, "medium" for normal, "high" for time-sensitive, "urgent" for critical`

// TODO: Accept user memories to improve auto-fill quality
// e.g. user timezone, preferred agents, project context, recurring patterns
export async function autoFillTask(
  title: string
): Promise<AutoFillResult | null> {
  const [departments, agents, setting] = await Promise.all([
    getAllDepartments(),
    getAllAgents(),
    getSetting()
  ])

  const { chatModel, apiKey } = getModelFromProvider(setting)

  const agentList =
    agents.length > 0
      ? agents
          .filter((a) => a.isActive)
          .map((a) => {
            const dept = departments.find((d) => d.id === a.departmentId)
            return `- Agent "${a.name}" (id: ${a.id}, department: "${dept?.name ?? 'unknown'}", departmentId: ${a.departmentId}): ${a.description ?? 'No description'}`
          })
          .join('\n')
      : '(no agents available)'

  const result = await completeSimple(
    chatModel,
    {
      systemPrompt: autoFillPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Task title: ${title}\n\nAvailable agents:\n${agentList}`
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
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0]) as AutoFillResult

    // Validate agentId exists and is active
    if (parsed.agentId) {
      const agent = agents.find((a) => a.id === parsed.agentId && a.isActive)
      if (!agent) {
        parsed.agentId = null
        parsed.departmentId = null
      }
    }

    // Validate mode/cronExpression consistency
    if (parsed.mode !== 'cron') {
      parsed.cronExpression = null
    }

    return parsed
  } catch {
    console.error('Failed to parse auto-fill response:', text)
    return null
  }
}
