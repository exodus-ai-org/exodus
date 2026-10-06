/**
 * The composer's row, as ChatGPT's: while the text fits one line the field
 * sits between `+` and the round button, a pill; once it wraps the field takes
 * the top on its own, full width, and the buttons a row under it. Nothing is
 * then ever centred against a field of changing height.
 *
 * The decision is made from the field's height *at the width it has beside
 * the buttons*, whatever width it has now. Measured at its own width, text
 * that wraps beside the buttons but fits alone on the wide line would flip
 * between the two layouts on every pass.
 */

/** The field is pinned to a 24px line (`leading-6`) with 4px above and below (`py-1`). */
export const COMPOSER_LINE_HEIGHT = 24
export const COMPOSER_FIELD_PADDING_Y = 8
export const COMPOSER_ONE_LINE_HEIGHT =
  COMPOSER_LINE_HEIGHT + COMPOSER_FIELD_PADDING_Y

/** The width the field has beside the buttons: the row less the buttons and the two gaps. */
export function compactFieldWidth({
  rowWidth,
  leadingWidth,
  trailingWidth,
  gap
}: {
  rowWidth: number
  leadingWidth: number
  trailingWidth: number
  gap: number
}): number {
  return Math.max(0, rowWidth - leadingWidth - trailingWidth - 2 * gap)
}

/**
 * Whether text needing `scrollHeight` at the compact width has wrapped past
 * one line. Two pixels of slack: browsers round a line's height.
 */
export function wrapsPastOneLine(
  scrollHeight: number,
  oneLineHeight = COMPOSER_ONE_LINE_HEIGHT
): boolean {
  return scrollHeight > oneLineHeight + 2
}
