import { tool } from 'ai'
import { addDays, format } from 'date-fns'
import { z } from 'zod'

export const date = tool({
  description:
    'Display date to the user. You should give the offset as a parameter to today.',
  parameters: z.object({ offset: z.number() }),
  execute: async ({ offset }: { offset: number }) => {
    return format(addDays(new Date(), offset), 'PPPP')
  }
})
