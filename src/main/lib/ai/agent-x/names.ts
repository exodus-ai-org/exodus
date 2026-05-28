// src/main/lib/ai/agent-x/names.ts
// Gender-neutral, culturally-mixed pool for auto-named employees.
export const NAME_POOL = [
  'Avery',
  'Riley',
  'Quinn',
  'Jordan',
  'Sage',
  'Reese',
  'Rowan',
  'Morgan',
  'Kai',
  'Nova',
  'Eden',
  'Tate',
  'Skyler',
  'Lane',
  'Hayden',
  'Emery'
] as const

/** Pick a name not already in `taken`; if all are taken, suffix with a number. */
export function pickName(taken: readonly string[] = []): string {
  const available = NAME_POOL.filter((n) => !taken.includes(n))
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)]
  }
  const base = NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)]
  let i = 2
  while (taken.includes(`${base} ${i}`)) i++
  return `${base} ${i}`
}
