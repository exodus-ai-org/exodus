// src/main/lib/ai/agent-x/pm-tools.ts
import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'

export function createDelegateTaskTool(
  roster: Array<{ id: string; name: string; description: string | null }>,
  onDelegate: (p: {
    employeeId: string
    instructions: string
  }) => Promise<string>
): AgentTool {
  const list = roster
    .map(
      (a) => `- ${a.name} (id: ${a.id}): ${a.description ?? 'no description'}`
    )
    .join('\n')
  return {
    name: 'delegateTask',
    label: 'Delegate Task',
    description: `Assign a sub-task to one employee and get their result back. Current employees:\n${list || '(none yet — recruit one first)'}`,
    parameters: Type.Object({
      employeeId: Type.String({ description: 'id of the employee to assign' }),
      instructions: Type.String({ description: 'clear, complete instructions' })
    }),
    execute: async (
      _id: string,
      p: { employeeId: string; instructions: string }
    ) => {
      const result = await onDelegate(p)
      return {
        content: [{ type: 'text' as const, text: result }],
        details: { employeeId: p.employeeId, result }
      }
    }
  } as AgentTool
}

export function createRecruitEmployeeTool(
  onRecruit: (p: { role: string; skills: string[]; name?: string }) => Promise<{
    id: string
    name: string
  }>
): AgentTool {
  return {
    name: 'recruitEmployee',
    label: 'Recruit Employee',
    description:
      'Create a new virtual employee when no current employee fits the work. They join the group immediately.',
    parameters: Type.Object({
      role: Type.String({ description: 'what this employee specializes in' }),
      skills: Type.Array(Type.String(), {
        description: 'skill slugs',
        default: []
      }),
      name: Type.String({
        description: 'optional name; auto-assigned if omitted',
        default: ''
      })
    }),
    execute: async (
      _id: string,
      p: { role: string; skills: string[]; name?: string }
    ) => {
      const emp = await onRecruit({
        role: p.role,
        skills: p.skills ?? [],
        name: p.name || undefined
      })
      return {
        content: [
          {
            type: 'text' as const,
            text: `Recruited ${emp.name} (id: ${emp.id}).`
          }
        ],
        details: emp
      }
    }
  } as AgentTool
}
