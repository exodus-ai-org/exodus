// The questionnaire and the confirmation a reply can ask with (exodus-ios spec
// 2026-10-06): a fenced block whose info string names it and whose body is one
// JSON object. One that validates is drawn as a control; anything else stays
// the code block it is. exodus-ios has the same rules (`InteractiveBlock`),
// held to the same vectors; lengths are UTF-16 units there too.
import { z } from 'zod'

export const INTERACTIVE_LANGUAGES = {
  ask: 'exodus-ask',
  confirm: 'exodus-confirm'
} as const

export type InteractiveKind = keyof typeof INTERACTIVE_LANGUAGES

/**
 * A string of `min` to `max` UTF-16 units — JavaScript's `length`, as the
 * phone counts. zod's own `.min`/`.max` count code points, which would let an
 * emoji-heavy label through here that the phone turns away.
 */
const text = (min: number, max: number) =>
  z
    .string()
    .refine((s) => s.length >= min, {
      message: `Too small: expected string to have >=${min} characters`
    })
    .refine((s) => s.length <= max, {
      message: `Too big: expected string to have <=${max} characters`
    })

/** An optional label: absent, null or a string of at most `max`. */
const label = (max: number) => text(0, max).nullish()

const distinct = (values: readonly string[]) =>
  new Set(values).size === values.length

export const askQuestionSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]{1,32}$/u),
  text: text(1, 200),
  type: z.enum(['single', 'multi']),
  options: z.array(text(1, 80)).min(2).max(8).refine(distinct),
  /** Adds "Other…", a choice the user types into. */
  other: z.boolean().nullish()
})

export const askBlockSchema = z.object({
  title: text(1, 200),
  questions: z
    .array(askQuestionSchema)
    .min(1)
    .max(8)
    .refine((questions) => distinct(questions.map((q) => q.id))),
  /** The closing field's label; the client's own when absent. */
  note: label(120),
  /** The button's label; the client's own when absent. */
  submit: label(40)
})

export const confirmBlockSchema = z.object({
  title: text(1, 200),
  /** Markdown. */
  details: label(1000),
  approve: label(40),
  reject: label(40),
  note: label(120)
})

export type AskQuestion = z.infer<typeof askQuestionSchema>
export type AskBlock = z.infer<typeof askBlockSchema>
export type ConfirmBlock = z.infer<typeof confirmBlockSchema>

/** A reply's block, and the text of its fence — how its code block is known. */
export type InteractiveFence =
  | { kind: 'ask'; block: AskBlock; source: string }
  | { kind: 'confirm'; block: ConfirmBlock; source: string }

/** The block a fence's info string names, or null. */
export function interactiveKind(language: string): InteractiveKind | null {
  if (language === INTERACTIVE_LANGUAGES.ask) return 'ask'
  if (language === INTERACTIVE_LANGUAGES.confirm) return 'confirm'
  return null
}

/** A fence's body as its block, or null when it is not one JSON object within the limits. */
export function parseInteractiveBlock(
  kind: InteractiveKind,
  source: string
): InteractiveFence | null {
  let value: unknown
  try {
    value = JSON.parse(source)
  } catch {
    return null
  }
  if (kind === 'ask') {
    const parsed = askBlockSchema.safeParse(value)
    return parsed.success ? { kind, block: parsed.data, source } : null
  }
  const parsed = confirmBlockSchema.safeParse(value)
  return parsed.success ? { kind, block: parsed.data, source } : null
}

/** A line that opens or closes a fence: up to three spaces, then three or more backticks or tildes. */
function fenceRun(
  line: string
): { char: string; length: number; rest: string } | null {
  let start = 0
  while (start < 3 && line[start] === ' ') start++
  const char = line[start]
  if (char !== '`' && char !== '~') return null
  let end = start
  while (line[end] === char) end++
  if (end - start < 3) return null
  return { char, length: end - start, rest: line.slice(end) }
}

/**
 * A reply's block: its first `exodus-ask` / `exodus-confirm` fence that opens a
 * line at the left margin — not inside another fence, a list or a quote — and
 * is closed. Only that first one counts: when it does not validate the reply
 * has none, and a second is code either way. A fence still open (a reply
 * being written) is not a block yet.
 */
export function findInteractiveBlock(
  markdown: string
): InteractiveFence | null {
  const lines = markdown.split('\n')
  let open: { char: string; length: number } | null = null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const run = fenceRun(line)
    if (open) {
      if (
        run &&
        run.char === open.char &&
        run.length >= open.length &&
        run.rest.trim() === ''
      ) {
        open = null
      }
      continue
    }
    const kind = line.startsWith('```')
      ? interactiveKind(line.slice(3).trimEnd())
      : null
    if (kind) {
      for (let j = i + 1; j < lines.length; j++) {
        const close = fenceRun(lines[j])
        if (close && close.char === '`' && close.rest.trim() === '') {
          return parseInteractiveBlock(kind, lines.slice(i + 1, j).join('\n'))
        }
      }
      return null
    }
    if (run) open = { char: run.char, length: run.length }
  }
  return null
}
