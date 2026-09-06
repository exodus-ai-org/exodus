import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { cwd } from 'process'

import { is } from '@electron-toolkit/utils'

import type { HelperCommand, InputHelper, TargetWindow } from './types'

const BINARY_NAME = 'exodus-input'

/**
 * Where the prebuilt Swift binary lives:
 * - dev: `<repo-root>/resources/bin/exodus-input` (committed, `pnpm dev` runs
 *   from the repo root)
 * - packaged: `process.resourcesPath/bin/exodus-input` (electron-builder
 *   `extraResources: [{ from: resources/bin, to: bin }]`), with the
 *   `app.asar.unpacked` copy as a fallback since `asarUnpack: resources/**`
 *   also matches it.
 */
function resolveBinaryPath(): string {
  const candidates = is.dev
    ? [join(cwd(), 'resources', 'bin', BINARY_NAME)]
    : [
        join(process.resourcesPath, 'bin', BINARY_NAME),
        join(
          process.resourcesPath,
          'app.asar.unpacked',
          'resources',
          'bin',
          BINARY_NAME
        )
      ]
  return (
    candidates.find((p) => existsSync(p)) ?? candidates[candidates.length - 1]
  )
}

/**
 * Newline-delimited JSON, one command per line, exactly as `exodus-input input`
 * reads it from stdin. Pure — unit-tested directly.
 */
export function serialize(commands: HelperCommand[]): string {
  return commands.map((c) => `${JSON.stringify(c)}\n`).join('')
}

interface RunOptions {
  /** Written to the child's stdin, which is then closed. */
  stdin?: string
}

/** Spawn `exodus-input <args>`, resolve stdout on exit 0, reject otherwise. */
function run(args: string[], options: RunOptions = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(resolveBinaryPath(), args, {
      stdio: ['pipe', 'pipe', 'pipe']
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))
    child.on('error', reject)
    // A short-lived helper that exits before we finish writing stdin makes the
    // pipe emit EPIPE; the `close`/`error` handlers already carry the outcome.
    child.stdin.on('error', () => {})
    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout))
        return
      }
      const message = Buffer.concat(stderr).toString('utf8').trim()
      reject(
        new Error(
          `exodus-input ${args.join(' ')} exited with code ${code}${
            message ? `: ${message}` : ''
          }`
        )
      )
    })

    if (options.stdin !== undefined) {
      child.stdin.end(options.stdin)
    } else {
      child.stdin.end()
    }
  })
}

interface RawWindow {
  id: number
  app: string
  bundleId: string
  title: string
  bounds: [number, number, number, number]
}

/** Talks to the real `exodus-input` binary. macOS only. */
export const realHelper: InputHelper = {
  async listWindows() {
    const out = await run(['list-windows'])
    const raw = JSON.parse(out.toString('utf8')) as RawWindow[]
    return raw.map((w) => ({
      cgWindowId: w.id,
      app: w.app,
      bundleId: w.bundleId,
      title: w.title,
      bounds: w.bounds
    }))
  },

  async screenshot(cgWindowId) {
    return run(['screenshot', '--window', String(cgWindowId)])
  },

  async send(commands, clamp) {
    const args = ['input']
    if (clamp) args.push('--clamp', clamp.join(','))
    await run(args, { stdin: serialize(commands) })
  }
}

/**
 * In-memory `InputHelper` for tests: records every `send()` call, returns canned
 * `listWindows()` / `screenshot()` values. Selected by `getHelper()` when
 * `EXODUS_INPUT_MOCK` is set.
 */
export interface MockHelper extends InputHelper {
  /** One entry per `send()` call, in order. */
  sent: HelperCommand[][]
  /** The `clamp` arg of each `send()` call, index-aligned with `sent`. */
  sentClamps: Array<[number, number, number, number] | undefined>
  __setWindows(windows: TargetWindow[]): void
  __setScreenshot(buffer: Buffer): void
  /** Clear recorded calls and canned values. */
  __reset(): void
}

let cannedWindows: TargetWindow[] = []
let cannedScreenshot: Buffer = Buffer.alloc(0)

export const mockHelper: MockHelper = {
  sent: [],
  sentClamps: [],

  async listWindows() {
    return cannedWindows
  },

  async screenshot() {
    return cannedScreenshot
  },

  async send(commands, clamp) {
    mockHelper.sent.push([...commands])
    mockHelper.sentClamps.push(clamp)
  },

  __setWindows(windows) {
    cannedWindows = windows
  },

  __setScreenshot(buffer) {
    cannedScreenshot = buffer
  },

  __reset() {
    mockHelper.sent = []
    mockHelper.sentClamps = []
    cannedWindows = []
    cannedScreenshot = Buffer.alloc(0)
  }
}

/**
 * The `InputHelper` the Runtime should use: `mockHelper` when
 * `EXODUS_INPUT_MOCK` is set to any truthy value, else the real binary client.
 */
export function getHelper(): InputHelper {
  return process.env.EXODUS_INPUT_MOCK ? mockHelper : realHelper
}
