// The chat's prompt teaches the two blocks and the answer that comes back;
// no other prompt does.
import {
  askBlockSchema,
  confirmBlockSchema
} from '@exodus/shared/types/interactive'
import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
const logger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
}))
vi.mock('@main/lib/logger', () => ({ logger }))
vi.mock('@main/lib/ai/memory/manager', () => ({
  callLlm: vi.fn(),
  loadRelevantMemories: vi.fn(),
  parseJsonFromResponse: vi.fn()
}))
vi.mock('@main/lib/ai/utils/model-util', () => ({
  getModelFromProvider: vi.fn()
}))
vi.mock('@main/lib/db/memory-queries', () => ({ createMemory: vi.fn() }))

const { ASK_EXAMPLE, CONFIRM_EXAMPLE, INTERACTIVE_BLOCKS_PROMPT } =
  await import('@main/lib/ai/interactive-blocks-prompt')
const {
  deepResearchBootPrompt,
  deepResearchSystemPrompt,
  getSystemPrompt,
  titleGenerationPrompt
} = await import('@main/lib/ai/prompts')
const { HEALTH_PERIOD_REPORT_SYSTEM, HEALTH_SUMMARY_SYSTEM } =
  await import('@main/lib/server/routes/health')

describe('the interactive blocks section', () => {
  it('is in the chat prompt, with both blocks and the answer fence', () => {
    const prompt = getSystemPrompt({})
    expect(prompt).toContain(INTERACTIVE_BLOCKS_PROMPT)
    expect(prompt).toContain(
      `\`\`\`exodus-ask\n${JSON.stringify(ASK_EXAMPLE)}\n\`\`\``
    )
    expect(prompt).toContain(
      `\`\`\`exodus-confirm\n${JSON.stringify(CONFIRM_EXAMPLE)}\n\`\`\``
    )
    expect(prompt).toContain('```exodus-answer')
    // Before the response format, after the citations.
    expect(prompt.indexOf('<interactive_blocks>')).toBeGreaterThan(
      prompt.indexOf('</citation_rules>')
    )
    expect(prompt.indexOf('</interactive_blocks>')).toBeLessThan(
      prompt.indexOf('<response_format>')
    )
  })

  it('shows examples the clients draw', () => {
    expect(askBlockSchema.safeParse(ASK_EXAMPLE).success).toBe(true)
    expect(confirmBlockSchema.safeParse(CONFIRM_EXAMPLE).success).toBe(true)
  })

  it('stays short: every chat turn reads it', () => {
    expect(INTERACTIVE_BLOCKS_PROMPT.split('\n').length).toBeLessThanOrEqual(40)
  })

  it('is in no other prompt', () => {
    for (const other of [
      deepResearchBootPrompt,
      deepResearchSystemPrompt,
      titleGenerationPrompt,
      HEALTH_SUMMARY_SYSTEM,
      HEALTH_PERIOD_REPORT_SYSTEM
    ]) {
      expect(other).not.toContain('exodus-ask')
      expect(other).not.toContain('exodus-confirm')
    }
  })
})
