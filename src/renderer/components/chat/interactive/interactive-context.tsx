// What a reply's blocks read: the turn's own block (found once over its whole
// answer, so a second block in a later paragraph stays code), and the chat's
// answers and send. Nothing is stored: a block is answered when the chat
// holds a user message whose answer fence names its run.
import type {
  ChatMessage,
  ChatStatus,
  SendMessageOptions
} from '@exodus/shared/types/chat'
import {
  findInteractiveBlock,
  type InteractiveFence
} from '@exodus/shared/types/interactive'
import {
  splitAnswer,
  type AnswerHead
} from '@exodus/shared/utils/interactive-answer'
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef
} from 'react'

/** A block's answer as the chat holds it: the fence's head and the lines after it. */
export interface Answered {
  head: AnswerHead
  body: string
}

export interface InteractiveChat {
  /** Each block answered so far, by the run whose reply holds it. */
  answers: ReadonlyMap<string, Answered>
  /** Whether an answer may be sent now: as the composer, not while a reply is on its way. */
  canSubmit: boolean
  submit: (text: string) => void
}

export interface InteractiveTurn {
  runId: string
  fence: InteractiveFence | null
  /**
   * False for an answer still being compared with another (or the version
   * that was not kept): its block is drawn but has no answer path.
   */
  answerable: boolean
}

const InteractiveChatContext = createContext<InteractiveChat | null>(null)
export const InteractiveTurnContext = createContext<InteractiveTurn | null>(
  null
)

/** A user message's words (its pictures aside). */
function messageText(message: ChatMessage): string {
  if (message.role !== 'user') return ''
  if (typeof message.content === 'string') return message.content
  return message.content
    .flatMap((part) => (part.type === 'text' ? [part.text] : []))
    .join('\n')
}

/** The answers in a chat's messages, by the run each names. */
export function answersIn(
  messages: readonly ChatMessage[]
): Map<string, Answered> {
  const answers = new Map<string, Answered>()
  for (const message of messages) {
    if (message.role !== 'user') continue
    const { answer, body } = splitAnswer(messageText(message))
    if (answer) answers.set(answer.ref, { head: answer, body })
  }
  return answers
}

/** Around a chat's transcript: its answers, and an answer sent as a typed message is (the composer's draft untouched). */
export function InteractiveProvider({
  messages,
  status,
  send,
  children
}: {
  messages: ChatMessage[]
  status: ChatStatus
  send: (opts: SendMessageOptions) => Promise<void>
  children?: ReactNode
}) {
  const answers = useMemo(() => answersIn(messages), [messages])
  const canSubmit = status !== 'submitted' && status !== 'streaming'
  // `useChat`'s send is a new function on every render; held here so the
  // blocks are not drawn again on every frame of a streaming reply.
  const sendRef = useRef(send)
  useEffect(() => {
    sendRef.current = send
  }, [send])
  const value = useMemo<InteractiveChat>(
    () => ({
      answers,
      canSubmit,
      submit: (text) => {
        void sendRef.current({ text })
      }
    }),
    [answers, canSubmit]
  )
  return (
    <InteractiveChatContext.Provider value={value}>
      {children}
    </InteractiveChatContext.Provider>
  )
}

export function useInteractiveChat(): InteractiveChat | null {
  return useContext(InteractiveChatContext)
}

/** A text as the block finder and the Markdown both read it: `\n` line ends. */
export const unixLines = (text: string) => text.replaceAll(/\r\n?/gu, '\n')

/** A turn's block, for the Markdown of its reply. */
export function useInteractiveTurn(
  runId: string,
  body: string,
  answerable = true
): InteractiveTurn {
  return useMemo(
    () => ({
      runId,
      fence: findInteractiveBlock(unixLines(body)),
      answerable
    }),
    [runId, body, answerable]
  )
}
