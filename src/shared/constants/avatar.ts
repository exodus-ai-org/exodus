// DiceBear style ids we ship. Final default is confirmed visually later.
export const AVATAR_STYLES = ['notionists', 'thumbs', 'adventurer'] as const
export type AvatarStyle = (typeof AVATAR_STYLES)[number]

export const DEFAULT_AVATAR_STYLE: AvatarStyle = 'notionists'

/** Deterministic-render seed; only the seed is stored, never the image. */
export function randomAvatarSeed(): string {
  return Math.random().toString(36).slice(2, 12)
}
