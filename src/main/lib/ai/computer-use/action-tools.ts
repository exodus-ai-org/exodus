// Computer Use — the inner agent's tool set.
//
// Spec §3.2. The inner model is given exactly these tools, one call per turn:
// the six input primitives, the four atoms, and the three control actions.
// No `bash`, no `text_editor`, no filesystem. `ACTION_TOOLS` are the TypeBox
// tool schemas handed to `complete()`; `toolCallToAction` turns the model's
// tool call back into the typed `Action` the runtime executes.

import { Type } from '@mariozechner/pi-ai'
import type { Tool } from '@mariozechner/pi-ai'

import type { Action, MouseButton } from '../../computer/types'

const point = (description: string) =>
  Type.Array(Type.Number(), { minItems: 2, maxItems: 2, description })

const button = Type.Union(
  [Type.Literal('left'), Type.Literal('right'), Type.Literal('middle')],
  { description: 'mouse button' }
)

export const ACTION_TOOLS: Tool[] = [
  {
    name: 'moveMouse',
    description:
      'Move the cursor to a window-relative point without pressing anything. Do this first when the cursor is far from where you intend to click.',
    parameters: Type.Object({
      to: point('[x, y] window-relative pixel to move the cursor to'),
      durationMs: Type.Optional(
        Type.Number({ description: 'optional glide time in milliseconds' })
      )
    })
  },
  {
    name: 'mouseDown',
    description:
      'Press and hold a mouse button at the current cursor position. Pair with mouseUp; for a normal click use `click` instead.',
    parameters: Type.Object({ button })
  },
  {
    name: 'mouseUp',
    description: 'Release a mouse button that mouseDown is holding.',
    parameters: Type.Object({ button })
  },
  {
    name: 'wheel',
    description:
      'Scroll the wheel by a delta from the current cursor position. Positive dy scrolls down, positive dx scrolls right.',
    parameters: Type.Object({
      dx: Type.Number({ description: 'horizontal scroll delta' }),
      dy: Type.Number({ description: 'vertical scroll delta' })
    })
  },
  {
    name: 'keyDown',
    description:
      'Press and hold a single key (e.g. "shift", "a", "enter", "cmd"). Pair with keyUp.',
    parameters: Type.Object({
      key: Type.String({ description: 'key name' })
    })
  },
  {
    name: 'keyUp',
    description: 'Release a key that keyDown is holding.',
    parameters: Type.Object({
      key: Type.String({ description: 'key name' })
    })
  },
  {
    name: 'click',
    description:
      'Move to a window-relative point and click. `count` 2 is a double-click; `button` defaults to left.',
    parameters: Type.Object({
      to: point('[x, y] window-relative pixel to click'),
      button: Type.Optional(button),
      count: Type.Optional(
        Type.Number({ description: 'number of clicks, default 1' })
      )
    })
  },
  {
    name: 'type',
    description:
      'Type a short run of literal text at the current keyboard focus. Never type passwords or one-time codes.',
    parameters: Type.Object({
      text: Type.String({ description: 'text to type' })
    })
  },
  {
    name: 'drag',
    description:
      'Press at one window-relative point, move to a second point, and release.',
    parameters: Type.Object({
      from: point('[x, y] window-relative pixel to start the drag'),
      to: point('[x, y] window-relative pixel to end the drag')
    })
  },
  {
    name: 'hotkey',
    description:
      'Press a chord of keys together, e.g. "cmd+c", "shift+tab", "cmd+shift+t".',
    parameters: Type.Object({
      combo: Type.String({ description: 'the key chord, "+"-separated' })
    })
  },
  {
    name: 'wait',
    description:
      'Do nothing for a while, then take a fresh screenshot. Use this to let the UI load or settle before acting again.',
    parameters: Type.Object({
      ms: Type.Number({ description: 'milliseconds to wait' })
    })
  },
  {
    name: 'askHuman',
    description:
      'Hand control back to the human for something only they can do — a 2FA code, a CAPTCHA, credentials you do not have. The session pauses until they answer.',
    parameters: Type.Object({
      question: Type.String({
        description: 'the specific thing you need from the human'
      })
    })
  },
  {
    name: 'done',
    description:
      'End the session — because the task is complete, or because you have tried what you reasonably can and are clearly stuck.',
    parameters: Type.Object({
      success: Type.Boolean({
        description: 'true if the task was accomplished'
      }),
      summary: Type.String({ description: 'one line on the outcome' })
    })
  }
]

/**
 * Maps a model tool call (name + arguments) to the typed `Action` the runtime
 * executes. Coerces the loosely-typed `arguments` and drops absent optionals so
 * the result compares cleanly. Throws on any name outside `ACTION_TOOLS`.
 */
export function toolCallToAction(
  name: string,
  args: Record<string, unknown>
): Action {
  switch (name) {
    case 'moveMouse':
      return {
        kind: 'moveMouse',
        to: args.to as [number, number],
        ...(args.durationMs === undefined
          ? {}
          : { durationMs: args.durationMs as number })
      }
    case 'mouseDown':
      return { kind: 'mouseDown', button: args.button as MouseButton }
    case 'mouseUp':
      return { kind: 'mouseUp', button: args.button as MouseButton }
    case 'wheel':
      return { kind: 'wheel', dx: args.dx as number, dy: args.dy as number }
    case 'keyDown':
      return { kind: 'keyDown', key: args.key as string }
    case 'keyUp':
      return { kind: 'keyUp', key: args.key as string }
    case 'click':
      return {
        kind: 'click',
        to: args.to as [number, number],
        ...(args.button === undefined
          ? {}
          : { button: args.button as MouseButton }),
        ...(args.count === undefined ? {} : { count: args.count as number })
      }
    case 'type':
      return { kind: 'type', text: args.text as string }
    case 'drag':
      return {
        kind: 'drag',
        from: args.from as [number, number],
        to: args.to as [number, number]
      }
    case 'hotkey':
      return { kind: 'hotkey', combo: args.combo as string }
    case 'wait':
      return { kind: 'wait', ms: args.ms as number }
    case 'askHuman':
      return { kind: 'askHuman', question: args.question as string }
    case 'done':
      return {
        kind: 'done',
        success: args.success as boolean,
        summary: args.summary as string
      }
    default:
      throw new Error(`unknown action: ${name}`)
  }
}
