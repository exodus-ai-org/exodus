# Claude Code driver — Exodus hands work to the user's own Claude Code and watches it through

Date: 2026-10-09 · Status: draft for the owner's review (direction agreed in chat, 2026-10-09; the open questions in §10 are the owner's)
Repo: `exodus` (desktop; the phone gets the card and its buttons in phase 1b, §7)
Reference: the probes of 2026-10-09 (`claude` 2.1.294, scratchpad `cc-probe/`): stream-json in and out, permission prompts answered by the host, deny, interrupt, resume, partial messages — all verified against the real CLI.

## 1. Goal

Exodus is not an AI-coding product and will not become one. It can still get code written: when the owner says "make me a prototype of …", Exodus hands the task to the Claude Code the owner already installed and logged into, shows what it is doing step by step, stops for the owner wherever Claude Code stops, and reports back when it is done. Exodus plays the human at the keyboard; Claude Code stays Claude Code: its login, its tools, its permission rules, its hooks, skills and MCP servers.

### Decided by the owner (2026-10-09)

| Decision           | Choice                                                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Which route        | Drive the user's installed `claude` CLI; no Agent SDK (the SDK may not offer claude.ai login to third parties, only API keys — its overview's note) |
| Authentication     | None in Exodus: whatever `claude` is logged in with                                                                                                 |
| Pre-warm           | No (unchanged since 2026-10-08)                                                                                                                     |
| Scope of this pass | MVP: start, watch, answer, interrupt, continue. Switching modes, installing skills, a terminal view and other CLIs come later                       |

### Non-goals

- A terminal emulator, a PTY, OSC 7501. stream-json gives everything OSC 7501 would and more; a TUI view is phase 3 (§9).
- Exodus' own coding tools, sandbox or editor. Exodus never edits the project; Claude Code does.
- Managing Claude Code's configuration (settings, skills, MCP, login). Exodus reads its version, nothing else.
- Approving anything on the owner's behalf. Exodus never answers a permission prompt by itself (§5).

## 2. The protocol, as verified

One process per session: `claude -p --input-format stream-json --output-format stream-json --verbose --include-partial-messages --permission-prompt-tool stdio [--permission-mode M] [--resume <cliSessionId>]`, run in the project directory.

| Direction | Line                                                                                                                                   | Meaning for Exodus                                                   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| → stdin   | `{type:'user', message:{role:'user', content}}`                                                                                        | a task, or a follow-up in the same session                           |
| ← stdout  | `system/init` (`session_id`, `model`, `permissionMode`, `tools`)                                                                       | a turn starts; keep `session_id` to resume                           |
| ← stdout  | `stream_event` (`content_block_delta` `text_delta` / `thinking_delta`)                                                                 | text as it is written                                                |
| ← stdout  | `assistant` (`text`, `thinking`, `tool_use{name, input}`), `user` (`tool_result{is_error, content}`)                                   | the steps                                                            |
| ← stdout  | `control_request {request_id, request:{subtype:'can_use_tool', tool_name, input}}`                                                     | **blocked**: a permission, or `AskUserQuestion` (structured options) |
| → stdin   | `control_response {response:{subtype:'success', request_id, response:{behavior:'allow', updatedInput} \| {behavior:'deny', message}}}` | the owner's answer; a deny's `message` reaches the model verbatim    |
| → stdin   | `control_request {request_id, request:{subtype:'interrupt'}}`                                                                          | stop; acknowledged in ~0.1 s                                         |
| ← stdout  | `result {subtype:'success' \| 'error_during_execution' \| …, result, total_cost_usd, duration_ms, permission_denials}`                 | the turn is over (an interrupt ends it `error_during_execution`)     |
| ← stdout  | `rate_limit_event {rate_limit_info}`                                                                                                   | the subscription's window; shown only when it is close               |

Observed behaviours the design must hold to:

1. **A `result` is not the end.** A background command Claude Code started finished 30 s after our last message and the CLI ran a turn of its own, `init` to `result`, unprompted. Exodus keeps reading for as long as the process lives.
2. After an interrupt the process lives on and the session continues; the model knows it was cut off.
3. `--resume <id>` in a new process continues the same session (same id, full memory). A process can exit between turns at no cost.
4. Read-only work (`ls`) does not prompt; writes do in the default mode. What prompts is Claude Code's rule, not Exodus'.
5. The user's own hooks, MCP servers, skills and CLAUDE.md load. Behaviour varies by user; Exodus does not try to normalise it.
6. Unknown event types and fields appear (`hook_started`, `thinking_tokens`, `status`…). The parser ignores what it does not know.

## 3. Where it lives: a tool in Chat

The owner talks to Exodus as always. Exodus' model gets one tool, `claude_code`, and decides to hand a task over when the request is to build or change code; the owner can also ask for it by name. The tool call is drawn as a **Claude Code card** in the transcript, live while it runs.

Why Chat and not Philharmonic: the scenario is one owner, one idea, one helper — Chat's shape. Philharmonic's employee loop has the seam for an external runtime (`runEmployeeLoop`'s signature), so a Claude Code employee is phase 2 (§9), on top of the same driver.

### The tool

`claude_code({ task, directory?, sessionId? })` in `TOOL_NAMES` and `calling-tools/claude-code.ts`.

- `task` — what to do, written by Exodus' model for Claude Code: the goal, the constraints the owner gave, what "done" means.
- `directory` — the project. Omitted: a new folder `~/Exodus Projects/<slug>/` (§10 Q2). Must exist or be creatable; never inside `~/.exodus`.
- `sessionId` — an Exodus agent-session id from an earlier call in this chat: a follow-up ("make the button blue") continues that Claude Code session instead of starting cold.

The call **blocks** until Claude Code's turn ends — minutes, possibly — streaming `tool_update`s for the card, and returns a compact result for Exodus' model: Claude Code's final text, the files it touched, denials, whether it was interrupted, the session id. Exodus' model then answers the owner in its own words ("It's done — open `index.html`; it skipped the tests because you said no to `npm install`").

The chat's Stop button aborts the run → the driver sends `interrupt` → the tool returns "interrupted" with whatever was done.

## 4. The card

One card per call, the steps timeline's look (the thinking scroll's capital-case tool names):

```
┌ Claude Code · ~/Exodus Projects/notes-prototype ───────── Working ◌ ┐
│ ✓ Write  index.html                                                 │
│ ✓ Write  app.js                                                     │
│ ◌ Bash   npm install                                                │
│ "Setting up a minimal Vite project with full-text search…"          │
└──────────────────────────────── Stop ───────── Open folder ─────────┘
```

- Header: the folder (click → Finder), the state: Working · Waiting for you · Done · Stopped · Failed.
- Steps: each `tool_use` as a row (tool name capital-case, one-line input: the path, the command); its `tool_result` ticks it or marks it failed. Long runs fold to the last few with "N more steps".
- The text Claude Code writes streams under the steps; finished, the final text is the card's body (Markdown).
- Footer: Stop while working; Open folder, and Continue in Terminal (`claude --resume <id>` in Terminal.app, §10 Q4) when done.
- After the run, the card stays as recorded (§6) — reopening the chat shows it whole.

### Waiting for you

A `control_request` puts the card in **Waiting for you** and shows, inside it:

- **A permission** — "Claude Code wants to run `npm install`" / "…to write `app.js`" (+ a diff preview for Edit, phase 1b), buttons **Allow** and **Deny**, and a field "Tell it why (optional)" whose text becomes the deny `message`. No "always allow" in phase 1: that is Claude Code's settings, not ours.
- **A question** (`AskUserQuestion`) — drawn with the questionnaire block's rows (`QuestionnaireStaticChoice`'s look, live), single or multi select per `multiSelect`, an Other field; Submit sends `allow` with `updatedInput.answers`.

While waiting, the chat run is still open (the tool is blocking), so the composer shows the run as busy, as for the existing secret-access approval. A notification fires if the window is in the background (`notifyIfBackground`): "Claude Code is waiting for you — npm install".

## 5. Safety

Claude Code is the user's own tool with its own permission system, and Exodus gives it nothing the user's terminal would not. But Exodus writes the task, and Exodus' model reads the web — so a poisoned page could become an instruction to Claude Code. The rules:

1. **Default permission mode is `default`** (Claude Code asks before writes and commands). `acceptEdits` and `auto` are a setting the owner turns on knowingly; `bypassPermissions` is never passed.
2. **Exodus never answers a `control_request` itself.** Every one is the owner's click. No timeout auto-deny either: the CLI waits; the card waits.
3. **The working directory** is never `~`, never inside `~/.exodus`, never `/`. A directory the owner did not name, and not the default projects folder, is shown in the card's header before the first step as "in <path>" — and the first call into a new directory outside the projects folder asks the owner (a confirmation block) before spawning.
4. **The environment is scrubbed**: the child gets the user's login-shell environment (§8), never Exodus' own variables, provider keys or the loopback port/token.
5. Exodus' secrets hardening (§2.5 of the 2026-09-25 spec) does not reach inside Claude Code — its file tools are its own. That is accepted and said in Settings: "Claude Code runs with its own permissions, in the folder you give it."

## 6. Data

New table `agent_session` (PGlite, drizzle):

| Column                   | Type                 | Note                                                            |
| ------------------------ | -------------------- | --------------------------------------------------------------- |
| `id`                     | text pk              | Exodus' id; the tool's `sessionId`                              |
| `kind`                   | text `'claude-code'` | room for other CLIs (§9)                                        |
| `chatId`                 | text fk → chat       | where the card lives                                            |
| `cliSessionId`           | text                 | Claude Code's `session_id`, for `--resume`                      |
| `cwd`                    | text                 |                                                                 |
| `state`                  | text                 | `working · blocked · done · stopped · error · exited`           |
| `title`                  | text                 | first line of the task                                          |
| `costUsd`                | numeric              | sum of the turns' `total_cost_usd` (notional on a subscription) |
| `createdAt`, `updatedAt` | timestamp            |                                                                 |

The card's content is the tool result message's `details` (the steps, the final text, the denials), written by the tool as it runs (`tool_update`) and saved with the run like any tool result — no second event table. An unprompted turn after the run ended (§2.1) is appended to the same `details` and pushed to an open chat over a small SSE (`GET /api/v1/agents/:id/sse`); the card re-renders. Claude Code's own transcript (`~/.claude/projects/…`) is never read.

## 7. The phone

Phase 1a is the desktop. Phase 1b, iOS draws the same card from the tool result's `details` (the chat stream already carries `tool_update`s), with Allow / Deny / the question rows posting to `POST /api/v1/agents/:id/respond` over the LAN — so "Claude Code is waiting for you" can be answered from the sofa. That is the one thing a terminal cannot do, and the reason this belongs in Exodus.

## 8. The driver (main process)

`src/main/lib/agents/claude-code/`:

- `locate.ts` — find `claude`: the Settings override, else `command -v claude` in the user's login shell (`$SHELL -lic`, once, cached; a packaged app launched from Finder has launchd's PATH and would not find `~/.local/bin` or `/opt/homebrew/bin`), else the usual install paths. `claude --version` for Settings. Not found → the tool is not offered to the model.
- `protocol.ts` — zod schemas for the lines in §2, `passthrough`; anything else is skipped. Pure; fixtures from the probes.
- `session.ts` — `ClaudeCodeSession`: spawns, reads NDJSON across chunks (`readline` on stdout), writes lines, holds the pending `control_request`s, exposes `send(task)`, `respond(requestId, answer)`, `interrupt()`, events as an async iterator, and the state machine `starting → working ⇄ blocked → done | stopped | error`, `exited` on process exit (an exit while `working`/`blocked` is `error` unless we stopped it).
- `registry.ts` — live sessions by id. One process per session; it stays up 10 minutes after a turn (a follow-up is instant and an unprompted turn is caught), then exits; the next call resumes. App quit: interrupt, then SIGTERM, then SIGKILL after 3 s; rows in `working`/`blocked` become `stopped`.
- `server/routes/agents.ts` — `POST /:id/respond`, `POST /:id/interrupt`, `GET /:id/sse`. Behind the existing auth gate (LAN needs the device token).

Settings (`settings.agents.claudeCode`, zod): `enabled` (default on when found), `binaryPath?`, `permissionMode` (`default` · `acceptEdits` · `auto`), `model?` (blank = Claude Code's own default), `projectsDir`. Settings › Agents shows found / not found, the version, and the safety line of §5.5.

The backend is written against a small interface so other CLIs can join without touching the tool or the card:

```ts
interface AgentDriver {
  start(input: { cwd: string; task: string; resume?: string }): AgentRun
}
interface AgentRun {
  events: AsyncIterable<AgentEvent> // step, text, blocked, turn_end, exit
  respond(requestId: string, answer: AgentAnswer): void
  send(text: string): void
  interrupt(): void
}
```

## 9. Phases

| Phase | What                                                                                                                                                                        |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1a    | Desktop: driver, `claude_code` tool, card with steps / text / permission / question / Stop, notifications, Settings › Agents                                                |
| 1b    | iOS card and answers; Edit diff preview in the permission                                                                                                                   |
| 2     | Philharmonic: an employee whose runtime is Claude Code (`agent.runtime`), through the same driver; the plan's step hands it the task                                        |
| 3     | A "Sessions" list of all agent sessions across chats; Continue in a terminal view (PTY + OSC 7501, for any program that speaks it); other CLIs (Codex) behind `AgentDriver` |
| later | The CLI's other abilities the owner named: switching mode mid-session, skills, `/commands`                                                                                  |

## 10. Open questions for the owner

1. **The name on the card.** "Claude Code" is what it is, and it is the owner's own install, not a product built on the SDK (whose branding rules forbid the name). Keep it, or a neutral "Coding agent" with the CLI's name underneath?
2. **Default folder** for a task without one: `~/Exodus Projects/<slug>` (visible, the owner's to keep) or the chat's workspace under `~/.exodus` (hidden, goes with the chat)?
3. **Blocking or detached.** Blocking (above) keeps Exodus' model in the loop to summarise and continue, but a long task holds the chat busy. Detached would return at once and post the summary later — more moving parts. Blocking for phase 1?
4. **Continue in Terminal**: worth a button in phase 1, or later?
5. **Usage**: Anthropic's note says SDK, `claude -p` and third-party apps draw on the subscription. Show Claude Code's cost and the 5-hour window on the card, or keep quiet unless the window is nearly gone?

## 11. Edge cases

- `claude` missing, not logged in, or too old (no `--permission-prompt-tool stdio`): the tool is not offered / the card fails with the CLI's own message and a link to Settings › Agents.
- The process dies mid-turn: the card shows Failed with stderr's last lines; the next call resumes.
- Two calls to the same session while it runs: the second waits for the turn to end (the CLI queues too; we do not interleave).
- The chat is deleted while a session runs: interrupt and exit; the project folder is left alone.
- The owner answers on the phone and the desktop at once: the first `respond` wins; the second gets 409 and the card refreshes.
- A `control_request` subtype we do not know: shown as "Claude Code needs you in a terminal" with Continue in Terminal; never auto-answered.
- Rate limit reached (`rate_limit_event` status not `allowed`): the card says so with the reset time.

## 12. Testing

- `protocol.ts`, `session.ts` state machine: Vitest against the probe fixtures (`events*.jsonl`), including the unprompted turn, the interrupt and the deny.
- The driver end to end against a **fake `claude`** (a Node script given as `binaryPath` that replays fixture lines and reads stdin), so CI never needs the real CLI or an account.
- The tool and card: renderer tests with recorded `details`.
- Manual, real CLI: a prototype from scratch; a follow-up in the same session; deny with a reason; a question; Stop mid-run; quit Exodus mid-run and resume; answering from the phone (1b).
