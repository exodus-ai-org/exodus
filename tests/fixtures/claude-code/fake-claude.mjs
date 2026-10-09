#!/usr/bin/env node
// tests/fixtures/claude-code/fake-claude.mjs — replays recorded Claude Code stdout (see the plan, Task 6).
import { appendFileSync, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'

const args = process.argv.slice(2)
if (args[0] === '--version') {
  console.log(process.env.FAKE_CLAUDE_VERSION ?? '2.1.294 (Claude Code)')
  process.exit(0)
}
if (args[0] === 'auth') {
  console.log(
    process.env.FAKE_CLAUDE_AUTH ??
      '{"loggedIn": true, "authMethod": "claude.ai"}'
  )
  process.exit(0)
}

const record = (o) =>
  process.env.FAKE_CLAUDE_RECORD &&
  appendFileSync(process.env.FAKE_CLAUDE_RECORD, JSON.stringify(o) + '\n')
record({ argv: args })

const lines = readFileSync(process.env.FAKE_CLAUDE_FIXTURE, 'utf8')
  .split('\n')
  .filter(Boolean)
const turns = []
let current = []
for (const line of lines) {
  const e = JSON.parse(line)
  if (
    e.type === 'system' &&
    e.subtype === 'init' &&
    current.some((l) => JSON.parse(l).subtype === 'init')
  ) {
    turns.push(current)
    current = []
  }
  current.push(line)
}
if (current.length) turns.push(current)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let written = 0
async function write(line) {
  if (process.env.FAKE_CLAUDE_SPLIT === '1') {
    const half = Math.floor(line.length / 2)
    process.stdout.write(line.slice(0, half))
    await sleep(5)
    process.stdout.write(line.slice(half) + '\n')
  } else {
    process.stdout.write(line + '\n')
  }
  written++
  const die = Number(process.env.FAKE_CLAUDE_DIE_AFTER ?? 0)
  if (die && written >= die) {
    process.stderr.write('boom\n')
    process.exit(1)
  }
}

let played = 0
let playing = false
const isPlaying = () => playing
let waitingFor = null // request_id we wait an answer for
let resumeWait = null
let interrupted = null // request_id of an interrupt

async function playTurn() {
  if (played >= turns.length) return
  playing = true
  const turn = turns[played++]
  let sessionId = null
  for (const line of turn) {
    if (interrupted) break
    const e = JSON.parse(line)
    sessionId = e.session_id ?? sessionId
    if (e.type === 'result' && interrupted) break
    await write(line)
    if (e.type === 'control_request') {
      waitingFor = e.request_id
      await new Promise((r) => (resumeWait = r))
    }
    await sleep(1)
  }
  if (interrupted) {
    await write(
      JSON.stringify({
        type: 'control_response',
        response: { subtype: 'success', request_id: interrupted, response: {} }
      })
    )
    await write(
      JSON.stringify({
        type: 'result',
        subtype: 'error_during_execution',
        is_error: true,
        session_id: sessionId,
        duration_ms: 1,
        permission_denials: []
      })
    )
    interrupted = null
  }
  playing = false
  const auto = Number(process.env.FAKE_CLAUDE_AUTOPLAY_AFTER ?? 0)
  if (auto && played === auto) setTimeout(playTurn, 20)
  else if (queue.length) {
    queue.shift()
    playTurn()
  }
}

if (process.env.FAKE_CLAUDE_GARBAGE === '1')
  process.stdout.write('Warning: not json\n')

const queue = []
createInterface({ input: process.stdin })
  .on('line', (line) => {
    record({ stdin: JSON.parse(line) })
    const m = JSON.parse(line)
    if (m.type === 'user') {
      queue.push(m)
      if (!playing) {
        queue.shift()
        playTurn()
      }
    } else if (
      m.type === 'control_response' &&
      m.response?.request_id === waitingFor
    ) {
      waitingFor = null
      resumeWait?.()
    } else if (
      m.type === 'control_request' &&
      m.request?.subtype === 'interrupt'
    ) {
      interrupted = m.request_id
      if (waitingFor) {
        waitingFor = null
        resumeWait?.()
      }
    }
  })
  .on('close', async () => {
    while (isPlaying()) await sleep(5)
    process.exit(0)
  })
