import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { Parser } from 'expr-eval'

const calculatorSchema = Type.Object({
  expression: Type.String({
    description:
      'A valid mathematical expression, e.g. "2 + 2", "sqrt(144)", "sin(PI/2)".'
  })
})

export const calculator: AgentTool<typeof calculatorSchema> = {
  name: 'calculator',
  label: 'Calculator',
  description:
    'Evaluate a mathematical expression and return the numeric result. Supports arithmetic, exponentiation, trigonometry, and common math functions.',
  parameters: calculatorSchema,
  execute: async (_toolCallId, { expression }) => {
    try {
      const result = Parser.evaluate(expression)
      const details = { expression, result: result.toString() }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(details) }],
        details
      }
    } catch (e) {
      throw new Error(
        e instanceof Error ? e.message : 'Failed to evaluate expression'
      )
    }
  }
}
