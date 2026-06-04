// src/main/lib/ai/philharmonic/pm-coordinator.ts
import type { AgentMessage, AgentTool } from '@mariozechner/pi-agent-core'
import { agentLoop } from '@mariozechner/pi-agent-core'
import type { Message } from '@mariozechner/pi-ai'
import { v4 as uuidV4 } from 'uuid'

import {
  addMemberToConversation,
  createConversationMessage,
  getMessagesByConversationId
} from '../../db/conversation-queries'
import { createTask, getActiveAgents } from '../../db/philharmonic-queries'
import {
  appendStepToPlan,
  createPlanWithSteps,
  getActivePlanByConversationId,
  updatePlanStatus,
  updateStep
} from '../../db/plan-queries'
import { getSettings } from '../../db/queries'
import { getAllTeams } from '../../db/team-queries'
import { getModelFromProvider } from '../utils/chat-message-util'
import { createEscalateToUserTool } from './agent-tools'
import { askUserRegistry } from './ask-user-registry'
import type { SseEmitter } from './employee-loop'
import { runDelegatedTask } from './execution-engine'
import { createSearchKnowledgeBaseTool } from './kb-tools'
import { toPlanDto, toStepDto } from './plan-dto'
import { writePlanMirror } from './plan-mirror'
import {
  createAppendPlanStepTool,
  createCreatePlanTool,
  createUpdatePlanStepTool
} from './plan-tools'
import { createDelegateTaskTool, createRecruitEmployeeTool } from './pm-tools'
import { autoCreateEmployee } from './recruit'
import { computeAllowedTeamIds } from './team-scope'

const PM_SYSTEM_PROMPT = `You are the PM (project manager) of a virtual team working in a group chat.

Plan-first discipline (mandatory):
1. The FIRST tool call on every new user request MUST be createPlan. Lay out the whole execution as ordered steps with clear titles and intent. Even a one-step plan is fine.
2. Before each delegation, call updatePlanStep(stepId, status="running").
3. After each delegation, call updatePlanStep(stepId, status="done", output=<one-paragraph summary>). On failure, use status="failed". If you decide a step is no longer needed, use status="skipped".
4. If you discover work the original plan missed, call appendPlanStep — don't free-form delegate outside the plan.

Execution loop:
- Decide which employees are needed. If an existing one fits, delegate via delegateTask with stepId. If nobody fits, recruitEmployee first, then delegate.
- After each employee returns, REVIEW their output against the step's goal. If it falls short, update the step to "failed" (or "pending" if you want to retry) and either delegate again with corrections, or recruit/replace. Never pass along sub-par work.
- When every step is done, write ONE final message that summarizes the outcome. Do not call any tool in that final turn.

Use searchKnowledgeBase for company-specific facts before asking the user. Use askUser only when truly blocked.
Delegate to one employee at a time.`

function rosterText(
  agents: {
    name: string
    teamId: string | null
    description: string | null
  }[],
  teamNameById: Map<string, string>
): string {
  if (agents.length === 0) return '(no employees yet)'
  return agents
    .map((a) => {
      const teamName = a.teamId ? teamNameById.get(a.teamId) : null
      return `- ${a.name}${teamName ? ` [${teamName}]` : ''}: ${a.description ?? 'no description'}`
    })
    .join('\n')
}

/**
 * Rebuild PM context from prior conversation messages. The route persists the
 * current user message BEFORE calling us, so without `excludeMessageId` that
 * message would appear in `history` AND be re-supplied as the prompt — making
 * the LLM see the current turn twice on every request.
 */
async function buildHistory(
  conversationId: string,
  excludeMessageId?: string
): Promise<Message[]> {
  const rows = await getMessagesByConversationId(conversationId)
  return rows
    .filter((r) => r.id !== excludeMessageId)
    .map((r) => ({
      role: r.role === 'user' ? 'user' : 'assistant',
      content: [{ type: 'text', text: r.content }],
      timestamp: new Date(r.createdAt).getTime()
    })) as Message[]
}

export interface RunPmArgs {
  conversationId: string
  userText: string
  /** ID of the just-persisted user message; excluded from history so the LLM doesn't see this turn twice. */
  excludeMessageId?: string
  emit: SseEmitter
  signal?: AbortSignal
}

export async function runPmCoordinator(args: RunPmArgs): Promise<void> {
  const { conversationId, userText, excludeMessageId, emit, signal } = args
  const setting = await getSettings()
  const { chatModel, apiKey } = getModelFromProvider(setting)

  const [employees, allTeams] = await Promise.all([
    getActiveAgents(),
    getAllTeams()
  ])
  const teamNameById = new Map(allTeams.map((t) => [t.id, t.name]))
  const history = await buildHistory(conversationId, excludeMessageId)
  // KB is scoped to teams whose members are in this conversation. General docs
  // (teamId IS NULL) ride along automatically inside the query.
  const allowedTeamIds = await computeAllowedTeamIds(conversationId)

  // Pick up an existing active plan if one is still in flight; PM mutates it
  // instead of creating a new one. The createPlan tool starts a fresh plan
  // when the previous one is completed/aborted.
  let activePlan = await getActivePlanByConversationId(conversationId)
  if (activePlan && activePlan.plan.status === 'completed') activePlan = null

  // Rewrite the markdown mirror; safe to call after any mutation.
  const mirrorActivePlan = async () => {
    const cur = await getActivePlanByConversationId(conversationId)
    if (cur) await writePlanMirror(conversationId, cur.plan, cur.steps)
  }

  const tools: AgentTool[] = [
    createCreatePlanTool(async ({ summary, steps }) => {
      // If the LLM tries to create a plan while one is still active (shouldn't
      // happen per prompt, but defend), close the old one first.
      if (activePlan && activePlan.plan.status === 'active') {
        await updatePlanStatus(activePlan.plan.id, 'aborted')
        emit({
          type: 'plan_status_changed',
          conversationId,
          status: 'aborted'
        })
      }
      const created = await createPlanWithSteps({
        conversationId,
        summary,
        steps: steps.map((s) => ({
          title: s.title,
          intent: s.intent,
          assignedAgentId: s.assignedAgentId
        }))
      })
      activePlan = created
      emit({
        type: 'plan_created',
        conversationId,
        plan: toPlanDto(created.plan, created.steps)
      })
      await writePlanMirror(conversationId, created.plan, created.steps)
      return {
        planId: created.plan.id,
        steps: created.steps.map((s) => ({
          id: s.id,
          title: s.title,
          ordinal: s.ordinal
        }))
      }
    }),
    createUpdatePlanStepTool(async ({ stepId, status, output, note }) => {
      const updated = await updateStep(stepId, {
        status,
        output: output ?? undefined,
        note: note ?? undefined
      })
      emit({
        type: 'plan_step_updated',
        conversationId,
        stepId,
        patch: {
          status: updated.status,
          output: updated.output,
          note: updated.note,
          startedAt: updated.startedAt ? updated.startedAt.toISOString() : null,
          completedAt: updated.completedAt
            ? updated.completedAt.toISOString()
            : null
        }
      })
      await mirrorActivePlan()
      return { stepId: updated.id }
    }),
    createAppendPlanStepTool(async ({ title, intent, assignedAgentId }) => {
      const planId = activePlan?.plan.id
      if (!planId) {
        throw new Error(
          'Cannot append step: no active plan. Call createPlan first.'
        )
      }
      const step = await appendStepToPlan(planId, {
        title,
        intent,
        assignedAgentId
      })
      emit({
        type: 'plan_step_appended',
        conversationId,
        step: toStepDto(step)
      })
      await mirrorActivePlan()
      return { stepId: step.id, ordinal: step.ordinal }
    }),
    createDelegateTaskTool(
      employees.map((e) => ({
        id: e.id,
        name: e.name,
        description: e.description
      })),
      async ({ employeeId, instructions, stepId }) => {
        // Bind to a plan step if provided. Mark running before kicking off
        // the employee loop, done/failed afterwards.
        if (stepId) {
          const ran = await updateStep(stepId, { status: 'running' })
          emit({
            type: 'plan_step_updated',
            conversationId,
            stepId,
            patch: {
              status: ran.status,
              startedAt: ran.startedAt ? ran.startedAt.toISOString() : null
            }
          })
          await mirrorActivePlan()
        }
        const childTask = await createTask({
          conversationId,
          title: `Delegated: ${instructions.slice(0, 80)}`,
          description: instructions,
          status: 'pending',
          priority: 'medium',
          assignedAgentId: employeeId,
          input: null,
          output: null,
          maxRetries: 1,
          retryCount: 0
        })
        try {
          const output = await runDelegatedTask({
            taskId: childTask.id,
            agentId: employeeId,
            conversationId,
            instructions,
            emit,
            signal
          })
          // Persist the employee's final output as a chat bubble.
          await createConversationMessage({
            conversationId,
            role: 'employee',
            agentId: employeeId,
            content: output,
            taskId: childTask.id
          })
          if (stepId) {
            // Step status moves to "done" only when the PM later calls
            // updatePlanStep — we don't auto-close, so the PM can choose
            // "done"/"failed" based on its review. We just attach the taskId.
            await updateStep(stepId, {
              taskId: childTask.id,
              output
            })
            await mirrorActivePlan()
          }
          return output
        } catch (err) {
          if (stepId) {
            const failed = await updateStep(stepId, { status: 'failed' })
            emit({
              type: 'plan_step_updated',
              conversationId,
              stepId,
              patch: {
                status: failed.status,
                completedAt: failed.completedAt
                  ? failed.completedAt.toISOString()
                  : null
              }
            })
            await mirrorActivePlan()
          }
          throw err
        }
      }
    ),
    createRecruitEmployeeTool(async ({ role, skills, name }) => {
      const emp = await autoCreateEmployee({ role, skills, name })
      await addMemberToConversation(conversationId, emp.id)
      emit({ type: 'member_joined', conversationId, agentId: emp.id })
      return { id: emp.id, name: emp.name }
    }),
    createSearchKnowledgeBaseTool(allowedTeamIds),
    createEscalateToUserTool(async ({ question, options }) => {
      emit({ type: 'ask_user', conversationId, question, options })
      return askUserRegistry.wait(conversationId)
    })
  ]

  const userMessage: Message = {
    role: 'user',
    content: [{ type: 'text', text: userText }],
    timestamp: Date.now()
  }

  const messageId = uuidV4()
  emit({ type: 'message_start', conversationId, messageId, role: 'pm' })

  let finalText = ''
  try {
    const stream = agentLoop(
      [userMessage as AgentMessage],
      {
        systemPrompt:
          PM_SYSTEM_PROMPT +
          `\n\nEmployees:\n${rosterText(employees, teamNameById)}`,
        messages: history as AgentMessage[],
        tools
      },
      {
        model: chatModel,
        apiKey,
        convertToLlm: (msgs: AgentMessage[]): Message[] =>
          msgs.filter(
            (m): m is Message =>
              (m as Message).role === 'user' ||
              (m as Message).role === 'assistant' ||
              (m as Message).role === 'toolResult'
          )
      },
      signal
    )

    for await (const event of stream) {
      if (event.type === 'message_update') {
        const msg = event.message as Message
        if (msg.role !== 'assistant') continue
        finalText = msg.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('')
        emit({
          type: 'message_delta',
          conversationId,
          messageId,
          delta: finalText
        })
      } else if (event.type === 'message_end') {
        const msg = event.message as Message & { role: 'assistant' }
        if (msg.role === 'assistant') {
          if (msg.stopReason === 'error') {
            throw new Error(
              msg.errorMessage ||
                'The PM model returned an error without details.'
            )
          }
          // Capture final text from message_end content if not already set via streaming
          const endText = msg.content
            .filter(
              (c): c is { type: 'text'; text: string } => c.type === 'text'
            )
            .map((c) => c.text)
            .join('')
          if (endText) finalText = endText
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    emit({ type: 'conversation_error', conversationId, error: message })
    await createConversationMessage({
      conversationId,
      role: 'system',
      content: `⚠️ PM error: ${message}`
    })
    emit({ type: 'message_end', conversationId, messageId })
    return
  }

  await createConversationMessage({
    conversationId,
    role: 'pm',
    content: finalText
  })
  emit({ type: 'message_end', conversationId, messageId })

  // Auto-close the plan when every step has reached a terminal state. The PM
  // doesn't need to ceremoniously declare the plan done — finishing the turn
  // without follow-up tools implies it.
  const final = await getActivePlanByConversationId(conversationId)
  if (final && final.plan.status === 'active' && final.steps.length > 0) {
    const allTerminal = final.steps.every(
      (s) =>
        s.status === 'done' || s.status === 'skipped' || s.status === 'failed'
    )
    if (allTerminal) {
      await updatePlanStatus(final.plan.id, 'completed')
      emit({
        type: 'plan_status_changed',
        conversationId,
        status: 'completed'
      })
      await mirrorActivePlan()
    }
  }
}
