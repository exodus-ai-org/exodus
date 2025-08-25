import { tool } from 'ai'
import { Parser } from 'expr-eval'
import { z } from 'zod'

export const calculator = tool({
  description:
    'Useful for getting the result of a math expression. The input to this tool should be a valid mathematical expression that could be executed by a simple calculator.',
  inputSchema: z.object({ expression: z.string() }),
  execute: async ({ expression }: { expression: string }) => {
    try {
      return Parser.evaluate(expression).toString()
    } catch (e) {
      return e instanceof Error
        ? e.message
        : 'Failed to calculate your expression'
    }
  }
})
