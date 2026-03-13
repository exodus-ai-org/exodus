import { tool } from 'ai'
import { Parser } from 'expr-eval'
import { z } from 'zod'

export const calculator = tool({
  description:
    'Evaluate a mathematical expression and return the numeric result. Supports arithmetic, exponentiation, trigonometry, and common math functions.',
  inputSchema: z.object({
    expression: z
      .string()
      .describe(
        'A valid mathematical expression, e.g. "2 + 2", "sqrt(144)", "sin(PI/2)".'
      )
  }),
  execute: async ({ expression }) => {
    try {
      const result = Parser.evaluate(expression)
      return { expression, result: result.toString() }
    } catch (e) {
      throw new Error(
        e instanceof Error ? e.message : 'Failed to evaluate expression'
      )
    }
  }
})
