// src/main/lib/ai/philharmonic/pm-tools.test.ts
import { describe, expect, it, vi } from 'vitest'
vi.mock('@mariozechner/pi-ai', () => ({
  Type: {
    Object: (o: unknown) => o,
    String: (o?: unknown) => o ?? {},
    Array: (t: unknown, o?: unknown) => o ?? {}
  }
}))

const { createDelegateTaskTool, createRecruitEmployeeTool } =
  await import('@main/lib/ai/philharmonic/pm-tools')

describe('pm-tools', () => {
  it('delegate tool lists the roster and calls the callback', async () => {
    const onDelegate = vi.fn(async () => 'employee result')
    const tool = createDelegateTaskTool(
      [{ id: 'a1', name: 'Avery', description: 'Analyst' }],
      onDelegate
    )
    expect(tool.description).toContain('Avery')
    const res = await tool.execute('id', {
      employeeId: 'a1',
      instructions: 'go'
    })
    expect(onDelegate).toHaveBeenCalledWith({
      employeeId: 'a1',
      instructions: 'go'
    })
    expect(JSON.stringify(res)).toContain('employee result')
  })

  it('recruit tool calls the callback and returns the new employee id', async () => {
    const onRecruit = vi.fn(async () => ({ id: 'a2', name: 'Quinn' }))
    const tool = createRecruitEmployeeTool(onRecruit)
    const res = await tool.execute('id', { role: 'Writer', skills: [] })
    expect(onRecruit).toHaveBeenCalled()
    expect(JSON.stringify(res)).toContain('a2')
  })
})
