# Philharmonic P1-5 — Live busy state in the Members panel

**Date:** 2026-06-05
**Status:** Approved, executing
**Scope:** Wire real activity into the right-column Members panel. Today it hard-codes `busyAgentIds={new Set()}` so every row says "idle". After P1-5 the panel shows which employees (and the PM) are actively working, with a label describing what they're doing — "running web_search…" while a tool is in flight, "thinking…" while the LLM is streaming text, "orchestrating…" for the PM.

## Goal

The user said they want to see how agents collaborate. The SSE feed already carries everything needed (`message_start/end`, `tool_card`, `pm_started/ended`); the renderer just isn't aggregating it. P1-5 builds that aggregation and feeds it into the existing panel.

## Decisions

- **Single SSE subscription per Group.** Today `useConversationStream` runs inside `GroupChat`. The container needs the same busy state for the Members panel. Hoisting the hook to `PhilharmonicContainer` and passing the `stream` object down keeps one EventSource per conversation and avoids subtle bugs from dual-subscription races.
- **One map: agentId → activity label.** Replace the existing `busyAgentIds: Set<string>` panel prop with `busyAgents: Map<string, string>`. Presence = busy; value = what they're doing. PM uses the sentinel key `'__pm__'` (the panel already uses that internally).
- **Activity labels are simple text, not structured.** "thinking…" / "running {toolName}…" / "orchestrating…" — enough for v1. We don't expose step ids, prompts, or anything sensitive. Future P1-5b can promote this to a richer timeline view.
- **Reset on conversation switch.** The map clears together with bubbles/plan when the active conversation changes — same pattern the rest of the stream already follows.

## State machine

For each employee `agentId`:

| Event                                                | Transition                                             |
| ---------------------------------------------------- | ------------------------------------------------------ |
| `message_start` with role='employee', agentId=A      | A → `'thinking…'`; remember `messageId → A` mapping    |
| `tool_card` phase='start' name=X with that messageId | A → `'running X…'`                                     |
| `tool_card` phase='end' with that messageId          | A → `'thinking…'` (back to default while text streams) |
| `message_end` with that messageId                    | drop A from the map                                    |

For the PM:

| Event        | Transition                      |
| ------------ | ------------------------------- |
| `pm_started` | `'__pm__'` → `'orchestrating…'` |
| `pm_ended`   | drop `'__pm__'`                 |

The PM's tool calls (`searchKnowledgeBase`, plan tools, etc.) update `'__pm__'` similarly — `tool_card` events whose `messageId` belongs to a `role='pm'` message label as "running {tool}…" on `__pm__`.

`conversation_error` clears the entire map: when something blew up, "idle" is the honest state until the user kicks off another turn.

## Renderer changes

- `useConversationStream` exposes `busyAgents: ReadonlyMap<string, string>` and tracks the state internally via two small Maps:
  - `messageIdToActor: Map<messageId, agentId | '__pm__'>` — bookkeeping during a turn
  - `busyAgents: Map<actor, label>` — driver
- `PhilharmonicContainer`:
  - Calls `useConversationStream(activeId)` once.
  - Drops the hardcoded `busyAgentIds={new Set()}`.
  - Passes the full `stream` object down to `GroupChat` so it doesn't subscribe twice.
  - Passes `busyAgents` to `GroupMembersPanel`.
- `GroupChat` accepts a `stream: ConversationStream | null` prop instead of calling the hook itself.
- `GroupMembersPanel`:
  - Signature: `busyAgents: ReadonlyMap<string, string>` replaces `busyAgentIds: Set<string>`. The header dot summary derives idle/busy counts from the map size.
  - Each row reads `busyAgents.get(member.id)`; presence selects the busy styling, value drives the secondary line text. Same logic for the PM row using `'__pm__'`.

## Out of scope

- Full timeline view (chronological event log). The activity labels per row are enough to show "who's doing what now"; the chat scroll already shows what happened.
- Per-step activity. Plan card already shows step status.
- Settings to mute the busy summary.

## File touchpoints

| File                                                                | Change                                                        |
| ------------------------------------------------------------------- | ------------------------------------------------------------- |
| `src/renderer/hooks/use-conversation-stream.ts`                     | Track `busyAgents`; expose in ConversationStream              |
| `src/renderer/containers/philharmonic.tsx`                          | Hoist hook; thread `busyAgents` to panel and `stream` to chat |
| `src/renderer/components/philharmonic/chat/group-chat.tsx`          | Accept `stream` prop; drop internal hook call                 |
| `src/renderer/components/philharmonic/chat/group-members-panel.tsx` | `busyAgents` map prop; per-row label                          |

## Tests

The state machine is small enough that a direct unit test is high-value. Given the hook depends on EventSource we add a test for a pure reducer extracted from it, exercising the transitions above.

## Rollout

Single commit. No migration.
