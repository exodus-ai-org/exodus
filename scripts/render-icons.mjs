#!/usr/bin/env node
// Rasterize the icon SVGs into the PNGs Electron's Tray + electron-builder
// expect. Uses headless Chrome — qlmanage produces a black-square preview
// for these template SVGs, and we'd rather not require a Homebrew install
// (librsvg) just for this one task.
//
// Run with `pnpm icons` after editing resources/icon{Template,}.svg.
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = resolve(new URL('..', import.meta.url).pathname)
const resources = join(root, 'resources')

// Try common Chrome / Chromium binary locations until we find one that
// exists. Edge and Brave also ship Chromium and accept the same flags, so
// they're acceptable fallbacks if the user has them but not Chrome itself.
const candidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  // Linux / WSL — listed for portability if someone runs this in CI later
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium'
]
const chrome = candidates.find((p) => existsSync(p))
if (!chrome) {
  console.error(
    'No Chrome/Chromium binary found. Install Chrome or edit scripts/render-icons.mjs.'
  )
  process.exit(1)
}

// Chrome's --screenshot reliably paints SVG into PNGs at "real" sizes
// (≥256px), but at tiny tray sizes (16/32/48) it captures a fully
// transparent buffer — the SVG either isn't laid out before the snapshot
// fires, or the viewport is too small for the rasterizer. So we render
// each template at 512px and downscale with sips, which produces sharper
// anti-aliased output anyway.
// 22/44/66 matches macOS NSStatusItem's default template icon size — at the
// 16/32/48 we used before, the menu bar scaled the icon down further than
// needed and the result looked cramped.
const jobs = [
  {
    src: 'iconTemplate.svg',
    size: 512,
    out: 'iconStarsTemplate.png',
    resize: 22
  },
  {
    src: 'iconTemplate.svg',
    size: 512,
    out: 'iconStarsTemplate@2x.png',
    resize: 44
  },
  {
    src: 'iconTemplate.svg',
    size: 512,
    out: 'iconStarsTemplate@3x.png',
    resize: 66
  },
  { src: 'icon.svg', size: 1024, out: 'iconStars.png' }
]

// Each run gets its own ephemeral profile dir — sharing one across `chrome
// --headless` invocations leaves a SingletonLock that the next run blocks on.
// We also can't rely on Chrome to self-exit after `--screenshot`: both old
// and new headless modes dawdle through post-screenshot tasks. So we spawn
// detached, poll the output path until the file appears (with a fresh
// mtime), then SIGKILL the Chrome tree ourselves.
async function renderOne(srcAbs, outAbs, size) {
  const profileDir = mkdtempSync(join(tmpdir(), 'exodus-icon-render-'))
  const before = existsSync(outAbs) ? statSync(outAbs).mtimeMs : 0

  const child = spawn(
    chrome,
    [
      '--headless=old',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--default-background-color=00000000',
      `--user-data-dir=${profileDir}`,
      `--screenshot=${outAbs}`,
      `--window-size=${size},${size}`,
      `file://${srcAbs}`
    ],
    { stdio: 'ignore', detached: true }
  )
  child.unref()

  try {
    const deadline = Date.now() + 15_000
    while (Date.now() < deadline) {
      if (existsSync(outAbs)) {
        const m = statSync(outAbs).mtimeMs
        if (m > before) return
      }
      await delay(100)
    }
    throw new Error(`Timeout rendering ${outAbs}`)
  } finally {
    try {
      // Kill the whole process group so helpers (gpu, renderer) don't linger.
      process.kill(-child.pid, 'SIGKILL')
    } catch {
      // Process group may already be gone — ignore.
    }
    rmSync(profileDir, { recursive: true, force: true })
  }
}

for (const { src, size, out, resize } of jobs) {
  const outAbs = join(resources, out)
  await renderOne(join(resources, src), outAbs, size)
  if (resize) {
    // sips resamples in-place; --resampleHeightWidth keeps it square.
    execFileSync(
      'sips',
      ['-z', String(resize), String(resize), outAbs, '--out', outAbs],
      { stdio: 'pipe' }
    )
    console.log(`✓ ${out} (rendered ${size}px → resized to ${resize}px)`)
  } else {
    console.log(`✓ ${out} (${size}×${size})`)
  }
}
