// The phone's daily health snapshot (aggregates only — never raw samples) and
// the report the desktop writes from it. exodus-ios mirrors both in
// Sources/Models/HealthWire.swift.
import { z } from 'zod'

const hhmm = z.string().regex(/^\d{2}:\d{2}$/)
const count = z.number().int().nonnegative()

export const odyStateSchema = z.enum([
  'permission',
  'noData',
  'tired',
  'recovering',
  'active',
  'rested',
  'calm',
  'happy'
])

export const moodLabelSchema = z.enum([
  'veryUnpleasant',
  'unpleasant',
  'slightlyUnpleasant',
  'neutral',
  'slightlyPleasant',
  'pleasant',
  'veryPleasant'
])

export const healthSnapshotSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    localTime: hhmm,
    locale: z.string().min(2).max(16),
    sleep: z
      .object({
        asleepMin: count,
        baselineMin: count.nullish(),
        deepMin: count,
        coreMin: count,
        remMin: count,
        awakeMin: count,
        bedtime: hhmm,
        wake: hhmm
      })
      .strict()
      .nullish(),
    activity: z
      .object({
        steps: count,
        stepGoal: count,
        activeKcal: count,
        kcalGoal: count.nullish(),
        exerciseMin: count,
        standHours: count,
        workouts: z
          .array(
            z
              .object({
                type: z.string().max(40),
                minutes: count,
                kcal: count.nullish()
              })
              .strict()
          )
          .max(20)
      })
      .strict()
      .nullish(),
    recovery: z
      .object({
        level: z.enum(['good', 'fair', 'low']).nullish(),
        hrvMs: z.number().nonnegative().nullish(),
        hrvBaselineMs: z.number().nonnegative().nullish(),
        restingHr: z.number().nonnegative().nullish(),
        restingHrBaseline: z.number().nonnegative().nullish(),
        respRate: z.number().nonnegative().nullish()
      })
      .strict()
      .nullish(),
    body: z
      .object({
        waterCups: count,
        weightKg: z.number().nonnegative().nullish(),
        weightTrend30d: z.number().nullish(),
        mood: moodLabelSchema.nullish()
      })
      .strict()
      .nullish(),
    odyState: odyStateSchema
  })
  .strict()

const line = z.string().min(1).max(200).nullable()

export const healthCategorySchema = z.enum([
  'sleep',
  'activity',
  'recovery',
  'body'
])

export const healthStatSchema = z
  .object({
    value: z.string().min(1).max(12),
    unit: z.string().min(1).max(16),
    caption: z.string().min(1).max(40).optional()
  })
  .strict()

export const healthInsightSchema = z
  .object({
    category: healthCategorySchema,
    text: z.string().min(1).max(160),
    // Exact substrings of `text`; the phone colours them.
    highlights: z.array(z.string().min(1).max(40)).max(3),
    stat: healthStatSchema.optional()
  })
  .strict()

export const healthSummarySchema = z.object({
  // The prompt asks for 60; the slack keeps a slightly long headline in a wordy language.
  headline: z.string().min(1).max(80),
  // An exact substring of `headline`, coloured as `headlineCategory`.
  headlineHighlight: z.string().min(1).max(80).optional(),
  headlineCategory: healthCategorySchema.optional(),
  // Most important first, at most one per category. Absent only in reports from before the redesign.
  insights: z.array(healthInsightSchema).min(1).max(4).optional(),
  nudge: z.string().min(1).max(140).optional(),
  // Markdown for phones that predate `insights`; the desktop builds it when the model leaves it out.
  summary: z.string().min(1).max(1200),
  categories: z.object({
    sleep: line,
    activity: line,
    recovery: line,
    body: line
  }),
  memorySuggestion: z
    .object({
      section: z.literal('profile'),
      key: z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .max(48),
      summary: z.string().min(1).max(120)
    })
    .nullable()
})

export type HealthSnapshot = z.infer<typeof healthSnapshotSchema>
export type HealthSummary = z.infer<typeof healthSummarySchema>
export type HealthInsight = z.infer<typeof healthInsightSchema>

type Loose = Record<string, unknown>
const isObject = (v: unknown): v is Loose =>
  v !== null && typeof v === 'object' && !Array.isArray(v)

function normaliseInsight(raw: unknown): HealthInsight | null {
  if (!isObject(raw) || typeof raw.text !== 'string') return null
  const text = raw.text
  const highlights = (Array.isArray(raw.highlights) ? raw.highlights : [])
    .filter(
      (h): h is string =>
        typeof h === 'string' &&
        h.length > 0 &&
        h.length <= 40 &&
        text.includes(h)
    )
    .slice(0, 3)
  const stat = healthStatSchema.safeParse(raw.stat)
  const insight = healthInsightSchema.safeParse({
    category: raw.category,
    text,
    highlights,
    ...(stat.success ? { stat: stat.data } : {})
  })
  return insight.success ? insight.data : null
}

/** The insight with its highlights in bold, for the Markdown `summary`. Overlapping highlights keep the first. */
function boldHighlights({ text, highlights }: HealthInsight): string {
  const ranges: Array<[number, number]> = []
  for (const h of highlights) {
    const start = text.indexOf(h)
    const end = start + h.length
    if (ranges.some(([s, e]) => start < e && s < end)) continue
    ranges.push([start, end])
  }
  ranges.sort((a, b) => b[0] - a[0])
  let out = text
  for (const [s, e] of ranges)
    out = `${out.slice(0, s)}**${out.slice(s, e)}**${out.slice(e)}`
  return out
}

/**
 * Brings a structured report into shape: what can't be trusted (a highlight that isn't in its sentence, a stat
 * too long, a second insight for one category) is dropped on its own rather than failing the report. Returns
 * null when insights were given but none survive.
 */
function normaliseStructured(value: Loose): Loose | null {
  if (value.insights === null || value.insights === undefined) {
    // An explicit null is the older shape too; the schema's optional() takes absent, not null.
    const { insights: _absent, ...older } = value
    return older
  }
  const seen = new Set<string>()
  const insights: HealthInsight[] = []
  for (const raw of Array.isArray(value.insights) ? value.insights : []) {
    const insight = normaliseInsight(raw)
    if (!insight || seen.has(insight.category)) continue
    seen.add(insight.category)
    insights.push(insight)
  }
  if (insights.length === 0) return null

  const { headlineHighlight, headlineCategory, nudge, summary, ...rest } = value
  const headline = typeof value.headline === 'string' ? value.headline : ''
  const highlightOk =
    typeof headlineHighlight === 'string' &&
    headlineHighlight.length > 0 &&
    headline.includes(headlineHighlight) &&
    healthCategorySchema.safeParse(headlineCategory).success
  const nudgeOk =
    typeof nudge === 'string' && nudge.length > 0 && nudge.length <= 140
  return {
    ...rest,
    insights: insights.slice(0, 4),
    ...(highlightOk ? { headlineHighlight, headlineCategory } : {}),
    ...(nudgeOk ? { nudge } : {}),
    summary:
      typeof summary === 'string' &&
      summary.length > 0 &&
      summary.length <= 1200
        ? summary
        : [headline, ...insights.map((i) => boldHighlights(i))].join('\n\n')
  }
}

/**
 * Reads a model's report. Optional parts (a suggestion, a highlight, a stat, a nudge, one insight among several)
 * that are malformed are dropped rather than failing the whole report; anything else wrong is still a failure
 * (null). A report without `insights` is the older shape and is accepted on its `summary` alone.
 */
export function parseHealthSummary(value: unknown): HealthSummary | null {
  if (!isObject(value)) return null
  const normalised = normaliseStructured(value)
  if (!normalised) return null
  const parsed = healthSummarySchema.safeParse(normalised)
  if (parsed.success) return parsed.data
  const withoutSuggestion = healthSummarySchema.safeParse({
    ...normalised,
    memorySuggestion: null
  })
  return withoutSuggestion.success ? withoutSuggestion.data : null
}
