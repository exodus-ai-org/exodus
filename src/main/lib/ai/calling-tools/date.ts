import { tool } from 'ai'
import { addDays, format } from 'date-fns'
import { z } from 'zod'

export const date = tool({
  description:
    'Get the current date and time, or a date relative to today. Use this whenever the user asks about the current date, time, or a future/past date.',
  inputSchema: z.object({
    offset: z
      .number()
      .int()
      .describe(
        'Number of days relative to today. 0 = today, 1 = tomorrow, -1 = yesterday.'
      )
      .default(0)
  }),
  execute: async ({ offset }) => {
    const target = addDays(new Date(), offset)
    return {
      date: format(target, 'PPPP'),
      iso: target.toISOString(),
      time: format(new Date(), 'HH:mm:ss'),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  }
})
