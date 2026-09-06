import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { v4 as uuidV4 } from 'uuid'

import { Guard } from '../../computer/guard'
import { liveness } from '../../computer/liveness'
import { runComputerSession } from '../../computer/session'
import { getSettings } from '../../db/queries'
import { ClaudeComputerAgent } from '../computer-use/agent'
import { getModelFromProvider } from '../utils/chat-message-util'

const schema = Type.Object({
  task: Type.String({
    description: 'What to accomplish in the target window'
  }),
  target: Type.String({
    description: 'App name or bundle id of the window to control'
  })
})

export const computerUse: AgentTool<typeof schema> = {
  name: 'computerUse',
  label: 'Computer Use',
  description:
    "Operate a single window on the user's Mac with a virtual mouse and " +
    'keyboard to accomplish a task — e.g. play a game, fill a web form, click ' +
    'through an app. `target` is the app name of the window to control (must ' +
    "be on the user's allowlist). This runs a multi-step session and returns " +
    'a summary; it is slow (seconds per step) and should only be used when ' +
    "direct API/tool alternatives don't exist.",
  parameters: schema,
  execute: async (_toolCallId, { task, target }, signal, onUpdate) => {
    try {
      const s = await getSettings()

      if (!s.computerUse?.enabled) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Computer Use is disabled in settings.'
            }
          ],
          details: { error: 'disabled' }
        }
      }

      // Exact (case-insensitive) match only — substring matching would let a
      // model-supplied target like "Not Chess" slip past an allowlisted "Chess".
      const allowlist = s.computerUse.targetAllowlist ?? []
      const wanted = target.trim().toLowerCase()
      if (!allowlist.some((a) => a.trim().toLowerCase() === wanted)) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Target "${target}" is not on the allowlist.`
            }
          ],
          details: { error: 'not-allowed' }
        }
      }

      const { chatModel, apiKey } = getModelFromProvider(s)
      const agent = new ClaudeComputerAgent({ task, model: chatModel, apiKey })

      const sessionId = uuidV4()
      const guard = new Guard()
      liveness.start(sessionId, guard)
      try {
        const result = await runComputerSession({
          sessionId,
          task,
          target,
          agent,
          guard,
          maxSteps: s.computerUse.maxSteps ?? 25,
          settleMs: s.computerUse.settleMs ?? 800,
          askHumanTimeoutMs: s.computerUse.askHumanTimeoutMs ?? 300_000,
          signal,
          onUpdate: (u) =>
            onUpdate?.({
              content: [{ type: 'text' as const, text: JSON.stringify(u) }],
              details: u
            })
        })

        return {
          content: [
            { type: 'text' as const, text: result.summary },
            ...(result.finalScreenshot
              ? [
                  {
                    type: 'image' as const,
                    data: result.finalScreenshot.data,
                    mimeType: 'image/png' as const
                  }
                ]
              : [])
          ],
          details: {
            sessionId,
            outcome: result.outcome,
            steps: result.steps
          }
        }
      } finally {
        liveness.end(sessionId)
      }
    } catch (e) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Computer session failed: ' + String(e)
          }
        ],
        details: { error: String(e) }
      }
    }
  }
}
