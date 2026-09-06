// Computer Runtime — capture + downscale.
//
// Screenshots the target window through the `exodus-input` helper and shrinks
// the PNG so the model's per-frame token cost stays bounded. The downscale ratio
// (`scaleFactor`) travels alongside the image so `hands.decompose` can map the
// model's downscaled clicks back to real screen pixels.
//
// `computeScale` and `hashPng` are pure and unit-tested directly;
// `screenshotWindow` is the thin `nativeImage` glue.

import { nativeImage } from 'electron'

import type { ComputerState, InputHelper, TargetWindow } from './types'

/**
 * Longest edge (px) a screenshot may have before it is downscaled. A window
 * whose longer side is at or below this is sent to the model as-is.
 */
export const MAX_EDGE = 1400

/**
 * Given an original window size, return the dimensions the screenshot should be
 * resized to plus the `scaleFactor` that maps downscaled coordinates back to the
 * original.
 *
 * `scaleFactor = resizedLongEdge / originalLongEdge` — a value in `(0, 1]`. A
 * 2800px-wide window resized to 1400px → `0.5`; a window already within
 * `MAX_EDGE` is not resized → `1`. `hands.decompose` inverts this as
 * `screen = origin + Math.round(downscaledCoord / scaleFactor)`.
 *
 * When a resize is needed the LONGER side becomes exactly `MAX_EDGE` and the
 * shorter side scales proportionally (rounded to a whole pixel).
 */
export function computeScale(
  width: number,
  height: number
): { width: number; height: number; scaleFactor: number } {
  const longEdge = Math.max(width, height)
  if (longEdge <= MAX_EDGE) {
    return { width, height, scaleFactor: 1 }
  }

  const scaleFactor = MAX_EDGE / longEdge
  return {
    width: width === longEdge ? MAX_EDGE : Math.round(width * scaleFactor),
    height: height === longEdge ? MAX_EDGE : Math.round(height * scaleFactor),
    scaleFactor
  }
}

/**
 * Cheap FNV-1a (32-bit) hash of a base64 string, returned as zero-padded hex.
 * Stable for a given input and sensitive to any change; `Guard.noteFrame` uses
 * it to notice a session that has stopped making progress (screen not changing).
 */
export function hashPng(base64: string): string {
  let hash = 2166136261
  for (let i = 0; i < base64.length; i++) {
    hash ^= base64.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Capture the target window and downscale it to fit `MAX_EDGE`. Returns the
 * screenshot in `ComputerState['screenshot']` shape plus the `scaleFactor` the
 * runtime threads into `hands.decompose`.
 */
export async function screenshotWindow(
  t: TargetWindow,
  helper: InputHelper
): Promise<{ shot: ComputerState['screenshot']; scaleFactor: number }> {
  const buf = await helper.screenshot(t.cgWindowId)
  const img = nativeImage.createFromBuffer(buf)
  const size = img.getSize()
  const { width, height, scaleFactor } = computeScale(size.width, size.height)
  const png =
    scaleFactor === 1 ? img.toPNG() : img.resize({ width, height }).toPNG()

  return {
    shot: {
      data: png.toString('base64'),
      mimeType: 'image/png',
      width,
      height
    },
    scaleFactor
  }
}
