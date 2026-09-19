import type { Segment } from '@exodus/shared/types/chat'

/**
 * Whether to show the "waiting for the assistant" spinner.
 *
 * The spinner has to bridge the gap between "message sent" and the first
 * visible assistant activity. pi-ai opens the provider stream and then often
 * sits silent for a beat (provider TTFT, reasoning ramp-up), during which it
 * still emits an empty assistant message. The old check ("is the last message
 * an assistant message?") flipped on that empty message and hid the spinner,
 * leaving a blank "did it disconnect?" gap.
 *
 * Instead, key off whether a *non-empty* assistant turn has surfaced: empty
 * turns are dropped by `groupIntoSegments`, so until real content — a thinking
 * step, a tool call, or streamed text — lands, the last segment is still the
 * user message and the spinner stays up. The moment progress appears, the
 * assistant turn renders its own timeline and the spinner goes away.
 */
export function shouldShowMessageSpinner(
  segments: Segment[],
  isLoading: boolean
): boolean {
  if (!isLoading) return false
  return segments[segments.length - 1]?.type !== 'assistantTurn'
}

export function MessageSpinner() {
  return (
    <div className="flex animate-pulse items-center justify-start space-x-2 p-2">
      <div className="h-2 w-2 rounded-full bg-blue-400"></div>
      <div className="h-2 w-2 rounded-full bg-green-400"></div>
      <div className="h-2 w-2 rounded-full bg-black dark:bg-white"></div>
    </div>
  )
}
