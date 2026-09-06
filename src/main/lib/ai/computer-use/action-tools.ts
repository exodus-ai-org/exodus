// Computer Use — the inner agent's tool set.
//
// Spec §3.2. The inner model is given a small set of *human verbs* — the ~11
// actions a person actually performs with a mouse and keyboard — not the raw
// motor primitives (`mouseDown`/`mouseUp`/`keyDown`/`keyUp`/…). Those primitives
// stay internal to the Controller's `hands.ts` decomposition and are never
// model-facing, matching how the frontier computer-use models were trained.
// `ACTION_TOOLS` are the TypeBox tool schemas handed to `complete()`;
// `toolCallToAction` turns the model's one tool call per turn into the typed
// `Action` the runtime executes.

import { Type } from '@mariozechner/pi-ai'
import type { Tool } from '@mariozechner/pi-ai'

import type { Action } from '../../computer/types'

const coord = (name: string) =>
  Type.Number({ description: `${name}, a pixel in the screenshot` })

export const ACTION_TOOLS: Tool[] = [
  {
    name: 'moveTo',
    description:
      "Move the cursor to (x, y) without pressing anything. Coordinates are in the screenshot's pixel space.",
    parameters: Type.Object({ x: coord('x'), y: coord('y') })
  },
  {
    name: 'leftClick',
    description:
      "Click the left mouse button at (x, y). Coordinates are in the screenshot's pixel space.",
    parameters: Type.Object({ x: coord('x'), y: coord('y') })
  },
  {
    name: 'doubleClick',
    description:
      "Double-click the left mouse button at (x, y). Coordinates are in the screenshot's pixel space.",
    parameters: Type.Object({ x: coord('x'), y: coord('y') })
  },
  {
    name: 'rightClick',
    description:
      "Click the right mouse button at (x, y) to open a context menu. Coordinates are in the screenshot's pixel space.",
    parameters: Type.Object({ x: coord('x'), y: coord('y') })
  },
  {
    name: 'drag',
    description:
      'Press at (x1, y1), move to (x2, y2), and release — to select text, move an item, or drag a slider.',
    parameters: Type.Object({
      x1: coord('x1, where the drag starts'),
      y1: coord('y1, where the drag starts'),
      x2: coord('x2, where the drag ends'),
      y2: coord('y2, where the drag ends')
    })
  },
  {
    name: 'scroll',
    description:
      'Scroll the wheel by (dx, dy) at the current cursor position — positive dy scrolls down. Move the cursor over the target area first if needed.',
    parameters: Type.Object({
      dx: Type.Number({ description: 'horizontal scroll delta' }),
      dy: Type.Number({
        description: 'vertical scroll delta, positive is down'
      })
    })
  },
  {
    name: 'type',
    description:
      'Type a run of literal text at the current keyboard focus. Never type passwords or one-time codes.',
    parameters: Type.Object({
      text: Type.String({ description: 'text to type' })
    })
  },
  {
    name: 'key',
    description:
      'Press a key or key combination, e.g. "return", "escape", "cmd+c", "cmd+shift+t".',
    parameters: Type.Object({
      combo: Type.String({
        description: 'the key or "+"-separated chord'
      })
    })
  },
  {
    name: 'wait',
    description:
      'Do nothing for the given number of milliseconds, then take a fresh screenshot. Use this to let the UI load or settle before acting again.',
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
      'Call when the task is complete, or when you are clearly stuck and cannot proceed.',
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
 * executes. The model speaks in human verbs; several of them collapse onto the
 * same internal `click` atom with a fixed `button`/`count`. Coerces the
 * loosely-typed `arguments` so the result compares cleanly. Throws on any name
 * outside `ACTION_TOOLS`.
 */
export function toolCallToAction(
  name: string,
  args: Record<string, unknown>
): Action {
  switch (name) {
    case 'moveTo':
      return {
        kind: 'moveMouse',
        to: [Number(args.x), Number(args.y)]
      }
    case 'leftClick':
      return {
        kind: 'click',
        to: [Number(args.x), Number(args.y)],
        button: 'left'
      }
    case 'doubleClick':
      return {
        kind: 'click',
        to: [Number(args.x), Number(args.y)],
        button: 'left',
        count: 2
      }
    case 'rightClick':
      return {
        kind: 'click',
        to: [Number(args.x), Number(args.y)],
        button: 'right'
      }
    case 'drag':
      return {
        kind: 'drag',
        from: [Number(args.x1), Number(args.y1)],
        to: [Number(args.x2), Number(args.y2)]
      }
    case 'scroll':
      return { kind: 'wheel', dx: Number(args.dx), dy: Number(args.dy) }
    case 'type':
      return { kind: 'type', text: String(args.text) }
    case 'key':
      return { kind: 'hotkey', combo: String(args.combo) }
    case 'wait':
      return { kind: 'wait', ms: Number(args.ms) }
    case 'askHuman':
      return { kind: 'askHuman', question: String(args.question) }
    case 'done':
      return {
        kind: 'done',
        success: Boolean(args.success),
        summary: String(args.summary)
      }
    default:
      throw new Error(`unknown action: ${name}`)
  }
}
