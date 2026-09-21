import { addDays, format, parseISO } from 'date-fns'
import { describe, expect, it } from 'vitest'

import { monthLabels } from '@/lib/heatmap-months'

/** The first day of `count` consecutive week columns, starting at `first`. */
const columns = (first: string, count: number) =>
  Array.from({ length: count }, (_, c) =>
    format(addDays(parseISO(first), c * 7), 'yyyy-MM-dd')
  )

describe('monthLabels', () => {
  it('labels the column where each month first appears', () => {
    expect(monthLabels(columns('2026-02-01', 9))).toEqual([
      { col: 0, label: 'Feb' },
      { col: 4, label: 'Mar' }
    ])
  })

  it('drops a leading month too short to fit its label before the next one', () => {
    // The year ending 2026-09-20: the first column is the last week of
    // September and October starts in the very next one, 14px later.
    const labels = monthLabels(columns('2025-09-28', 52))
    expect(labels[0]).toEqual({ col: 1, label: 'Oct' })
    expect(labels.at(-1)).toEqual({ col: 49, label: 'Sep' })
  })

  it('keeps a leading month that has room for its label', () => {
    expect(monthLabels(columns('2025-09-14', 6)).slice(0, 2)).toEqual([
      { col: 0, label: 'Sep' },
      { col: 3, label: 'Oct' }
    ])
  })

  it('keeps the trailing month however short — nothing follows it', () => {
    expect(monthLabels(columns('2026-09-06', 5)).at(-1)).toEqual({
      col: 4,
      label: 'Oct'
    })
  })

  it('is empty for no columns', () => {
    expect(monthLabels([])).toEqual([])
  })
})
