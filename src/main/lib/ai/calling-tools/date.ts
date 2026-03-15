import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { addDays, format } from 'date-fns'

const dateSchema = Type.Object({
  offset: Type.Number({
    description:
      'Number of days relative to today. 0 = today, 1 = tomorrow, -1 = yesterday.'
  })
})

export const date: AgentTool<typeof dateSchema> = {
  name: 'date',
  label: 'Date',
  description:
    'Get the current date and time, or a date relative to today. Use this whenever the user asks about the current date, time, or a future/past date.',
  parameters: dateSchema,
  execute: async (_toolCallId, { offset }) => {
    const target = addDays(new Date(), offset ?? 0)
    const details = {
      date: format(target, 'PPPP'),
      iso: target.toISOString(),
      time: format(new Date(), 'HH:mm:ss'),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(details) }],
      details
    }
  }
}
