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

export const healthSummarySchema = z.object({
  headline: z.string().min(1).max(40),
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
