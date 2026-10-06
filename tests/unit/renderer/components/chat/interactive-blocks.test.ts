// @vitest-environment happy-dom
// A turn's questionnaire or confirmation is drawn as a control and answers
// through the chat's send; once the chat holds the answer the block is frozen.
// Anything else — invalid, a second block, a fence still open, a block
// outside a turn — stays the code block it is.
import type {
  ChatMessage,
  ChatStatus,
  SendMessageOptions
} from '@exodus/shared/types/chat'
import {
  askBlockSchema,
  confirmBlockSchema
} from '@exodus/shared/types/interactive'
import {
  composeAskAnswer,
  composeConfirmAnswer,
  type AnswerLabels
} from '@exodus/shared/utils/interactive-answer'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key} ${JSON.stringify(params)}` : key
const i18n = { resolvedLanguage: 'en', language: 'en' }
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t, i18n }) }))

const { default: Markdown } = await import('@/components/markdown')
const {
  InteractiveProvider,
  InteractiveTurnContext,
  answersIn,
  useInteractiveTurn
} = await import('@/components/chat/interactive/interactive-context')

// What `answerLabels(t)` gives with `t` returning its key.
const LABELS: AnswerLabels = {
  other: 'interactive.answer.other',
  addition: 'interactive.answer.addition',
  note: 'interactive.answer.note',
  approved: 'interactive.approved',
  rejected: 'interactive.rejected'
}
const ASK = {
  title: 'Where does it itch?',
  questions: [
    {
      id: 'where',
      text: 'Where?',
      type: 'single',
      options: ['Legs', 'Arms'],
      other: true
    }
  ]
}
const CONFIRM = { title: 'Send the report?', details: 'To **Ann**, today.' }
const ASK_BLOCK = askBlockSchema.parse(ASK)
const CONFIRM_BLOCK = confirmBlockSchema.parse(CONFIRM)

const fence = (language: string, value: unknown) =>
  `\`\`\`${language}\n${typeof value === 'string' ? value : JSON.stringify(value)}\n\`\`\``
const userMessage = (id: string, text: string) =>
  ({ id, runId: id, role: 'user', content: text, timestamp: 1 }) as ChatMessage

/** A turn's reply as `AssistantTurnSegment` draws it: its Markdown under the turn's block. */
function Turn({ body, answerable }: { body: string; answerable?: boolean }) {
  const turn = useInteractiveTurn('run-1', body, answerable)
  return createElement(
    InteractiveTurnContext.Provider,
    { value: turn },
    createElement(Markdown, { src: body })
  )
}

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>
const send = vi.fn(async (_opts: SendMessageOptions) => {})

beforeEach(() => {
  send.mockClear()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

const show = (
  body: string,
  {
    messages = [],
    status = 'idle',
    answerable
  }: {
    messages?: ChatMessage[]
    status?: ChatStatus
    answerable?: boolean
  } = {},
  inTurn = true
) =>
  act(async () =>
    root.render(
      createElement(
        InteractiveProvider,
        { messages, status, send },
        inTurn
          ? createElement(Turn, { body, answerable })
          : createElement(Markdown, { src: body })
      )
    )
  )

const block = () => host.querySelector('[data-interactive]')
const button = (label: string) =>
  Array.from(host.querySelectorAll('button')).find(
    (b) => b.textContent === label
  )

describe('a questionnaire in a reply', () => {
  it('is drawn in place of its code, and Submit sends the composed answer', async () => {
    await show(`Before I answer:\n\n${fence('exodus-ask', ASK)}`)
    expect(block()?.getAttribute('data-interactive')).toBe('ask')
    expect(block()?.getAttribute('data-state')).toBe('open')
    expect(host.querySelector('pre')).toBeNull()

    const arms = host.querySelector<HTMLInputElement>('input[value="Arms"]')
    await act(async () => arms?.click())
    await act(async () => {
      host
        .querySelector('form')
        ?.dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true })
        )
    })
    expect(send).toHaveBeenCalledWith({
      text: composeAskAnswer(
        ASK_BLOCK,
        'run-1',
        { where: { options: ['Arms'], other: null } },
        '',
        LABELS
      )
    })
  })

  it('is frozen once the chat holds its answer: the picks shown, no Submit', async () => {
    const answer = composeAskAnswer(
      ASK_BLOCK,
      'run-1',
      { where: { options: ['Legs'], other: null } },
      '',
      LABELS
    )
    await show(fence('exodus-ask', ASK), {
      messages: [userMessage('u2', answer)]
    })
    expect(block()?.getAttribute('data-state')).toBe('answered')
    expect(host.querySelector('button[type="submit"]')).toBeNull()
    expect(
      Array.from(host.querySelectorAll('[data-picked]')).map(
        (n) => n.textContent
      )
    ).toEqual(['Legs'])
    expect(host.textContent).toContain('interactive.answered')
  })
})

describe('a confirmation in a reply', () => {
  it('Approve sends the decision and the note', async () => {
    await show(fence('exodus-confirm', CONFIRM))
    expect(block()?.getAttribute('data-state')).toBe('open')
    expect(host.querySelector('strong')?.textContent).toBe('Ann')

    const note = host.querySelector('textarea')
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value'
    )?.set
    await act(async () => {
      if (!note || !setValue) return
      setValue.call(note, 'cc Bob')
      note.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => button('interactive.approve')?.click())
    expect(send).toHaveBeenCalledWith({
      text: composeConfirmAnswer(CONFIRM_BLOCK, 'run-1', true, 'cc Bob', LABELS)
    })
  })

  it('sends nothing while a reply streams', async () => {
    await show(fence('exodus-confirm', CONFIRM), { status: 'streaming' })
    expect(button('interactive.approve')?.disabled).toBe(true)
    expect(button('interactive.reject')?.disabled).toBe(true)
    await act(async () => button('interactive.approve')?.click())
    expect(send).not.toHaveBeenCalled()
  })

  it('sends nothing from an answer still being compared (no answer path)', async () => {
    await show(fence('exodus-confirm', CONFIRM), { answerable: false })
    expect(block()?.getAttribute('data-state')).toBe('open')
    expect(button('interactive.approve')?.disabled).toBe(true)
    expect(button('interactive.reject')?.disabled).toBe(true)
    await act(async () => button('interactive.approve')?.click())
    expect(send).not.toHaveBeenCalled()
  })

  it('shows the decision once answered, without its buttons', async () => {
    const answer = composeConfirmAnswer(
      CONFIRM_BLOCK,
      'run-1',
      false,
      '',
      LABELS
    )
    await show(fence('exodus-confirm', CONFIRM), {
      messages: [userMessage('u2', answer)]
    })
    expect(block()?.getAttribute('data-state')).toBe('reject')
    expect(host.textContent).toContain('interactive.rejected')
    expect(button('interactive.approve')).toBeUndefined()
  })
})

describe('what stays code', () => {
  it('a block over the limits', async () => {
    await show(fence('exodus-ask', { ...ASK, questions: [] }))
    expect(block()).toBeNull()
    expect(host.querySelector('pre')).not.toBeNull()
  })

  it('a second block in the reply', async () => {
    await show(
      `${fence('exodus-confirm', CONFIRM)}\n\n${fence('exodus-ask', ASK)}`
    )
    expect(host.querySelectorAll('[data-interactive]')).toHaveLength(1)
    expect(block()?.getAttribute('data-interactive')).toBe('confirm')
    expect(host.querySelectorAll('pre')).toHaveLength(1)
  })

  it('a second block with the same text as the first', async () => {
    await show(`${fence('exodus-ask', ASK)}\n\n${fence('exodus-ask', ASK)}`)
    expect(host.querySelectorAll('[data-interactive]')).toHaveLength(1)
    expect(host.querySelectorAll('pre')).toHaveLength(1)
    // The first one is the control, the second its code.
    expect(
      host
        .querySelector('[data-interactive]')
        ?.compareDocumentPosition(host.querySelector('pre')!)
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('a tilde fence, and a fence whose info string says more than the name', async () => {
    const json = JSON.stringify(ASK)
    for (const opening of ['~~~exodus-ask', '```exodus-ask x']) {
      const close = opening.startsWith('~') ? '~~~' : '```'
      await show(`${opening}\n${json}\n${close}`)
      expect(block()).toBeNull()
      expect(host.querySelector('pre')).not.toBeNull()
    }
  })

  it('the same text in a tilde fence above the real block', async () => {
    await show(
      `~~~exodus-ask\n${JSON.stringify(ASK)}\n~~~\n\n${fence('exodus-ask', ASK)}`
    )
    expect(host.querySelectorAll('[data-interactive]')).toHaveLength(1)
    const pre = host.querySelector('pre')
    expect(pre).not.toBeNull()
    // The code is the tilde fence, above the control.
    expect(
      pre?.compareDocumentPosition(host.querySelector('[data-interactive]')!)
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('a fence still being written', async () => {
    await show('```exodus-ask\n{"title":"Where')
    expect(block()).toBeNull()
  })

  it('a block outside a turn (a user message, a tool description)', async () => {
    await show(fence('exodus-ask', ASK), {}, false)
    expect(block()).toBeNull()
    expect(host.querySelector('pre')).not.toBeNull()
  })
})

describe('a reply written with CRLF line ends', () => {
  it('still draws its block', async () => {
    const crlf = `Before I answer:\n\n${fence('exodus-confirm', {
      ...CONFIRM,
      details: 'line one'
    })}\n`.replaceAll('\n', '\r\n')
    await show(crlf)
    expect(block()?.getAttribute('data-interactive')).toBe('confirm')
    expect(host.querySelector('pre')).toBeNull()
  })
})

describe('answersIn', () => {
  it('maps each answer to the run it names; other messages are not answers', () => {
    const answer = composeConfirmAnswer(
      CONFIRM_BLOCK,
      'run-1',
      true,
      '',
      LABELS
    )
    const answers = answersIn([
      userMessage('u1', 'hello'),
      userMessage('u2', answer),
      {
        id: 'a1',
        runId: 'u1',
        role: 'assistant',
        content: [{ type: 'text', text: answer }],
        timestamp: 1
      } as unknown as ChatMessage
    ])
    expect([...answers.keys()]).toEqual(['run-1'])
    expect(answers.get('run-1')?.head.decision).toBe('approve')
  })
})
