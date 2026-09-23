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

/**
 * Three dots of the foreground colour, breathing in turn — a wave, not a
 * blink. Seen on every send, so it is the palette and nothing else: it
 * follows the colour tone and never reads as a status light. The wave is
 * `animate-pulse` offset by a third of its period per dot.
 */
export function MessageSpinner() {
  return (
    <div
      className="flex items-center justify-start gap-1.5 px-2 py-3"
      role="status"
      aria-live="polite"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="bg-foreground/40 size-1.5 animate-pulse rounded-full"
          style={{ animationDelay: `${i * 240}ms` }}
        />
      ))}
    </div>
  )
}
