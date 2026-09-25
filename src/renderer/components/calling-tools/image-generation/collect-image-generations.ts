import { TOOL_NAMES } from '@exodus/shared/constants/tool-names'
import type {
  ChatAssistantMessage,
  ChatMessage,
  ChatToolResultMessage
} from '@exodus/shared/types/chat'

/** One `image_generation` call of a run, and its result once there is one. */
export interface ImageGenerationCall {
  toolCallId: string
  /** The prompt from the call's arguments ('' while it is still streaming). */
  prompt: string
  result?: ChatToolResultMessage
}

/**
 * Every `image_generation` call of a run, in call order, each paired with its
 * result. One list for the pending and the finished calls, so the card that
 * showed an image forming is the same card (same key) the image resolves in.
 */
export function collectImageGenerations(
  messages: ChatMessage[]
): ImageGenerationCall[] {
  const calls: ImageGenerationCall[] = []
  const byId = new Map<string, ImageGenerationCall>()

  for (const msg of messages) {
    if (msg.role === 'assistant') {
      for (const block of (msg as ChatAssistantMessage).content) {
        if (
          block.type !== 'toolCall' ||
          block.name !== TOOL_NAMES.imageGeneration
        ) {
          continue
        }
        const prompt = block.arguments?.prompt
        const call: ImageGenerationCall = {
          toolCallId: block.id,
          prompt: typeof prompt === 'string' ? prompt : ''
        }
        calls.push(call)
        byId.set(block.id, call)
      }
    } else if (msg.role === 'toolResult') {
      const call = byId.get(msg.toolCallId)
      if (call) call.result = msg
    }
  }

  return calls
}
