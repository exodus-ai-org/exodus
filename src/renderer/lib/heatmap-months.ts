import { format, parseISO } from 'date-fns'

export interface MonthLabel {
  /** Index of the week column the label sits above. */
  col: number
  label: string
}

// A label is wider than the column it sits above, so a month needs this many
// columns before the next label or the two run into each other. Only the
// leading month can be that short — every later one has at least four weeks.
const MIN_LABEL_COLS = 3

/**
 * Month labels for a week-per-column heatmap: one at each column where a new
 * month first appears, minus any the next label would overlap. `columnStarts`
 * is the first day (`yyyy-MM-dd`) of every column, in order.
 */
export function monthLabels(columnStarts: string[]): MonthLabel[] {
  const labels: MonthLabel[] = []
  let lastMonth = ''
  columnStarts.forEach((date, col) => {
    const label = format(parseISO(date), 'MMM')
    if (label !== lastMonth) {
      labels.push({ col, label })
      lastMonth = label
    }
  })
  return labels.filter((m, i) => {
    const next = labels[i + 1]
    return !next || next.col - m.col >= MIN_LABEL_COLS
  })
}
