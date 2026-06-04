# Philharmonic P0-1 — Knowledge Base scoped to Team

**Date:** 2026-06-04
**Status:** Approved, executing
**Scope:** First of three P0 changes that align Philharmonic's runtime with its product vision. Touches only `knowledge_doc` and the surfaces that read/write it.

## Goal

A Knowledge Base document can belong to a Team. When a Group runs, knowledge retrieval is scoped to the Teams whose members are in that Group, plus a shared "General" bucket for company-wide facts. Each Team's KB stays its own; Chat is not affected.

## Decisions

- **1B Optional team attachment.** `knowledge_doc.teamId` is **nullable**. A doc with `teamId = NULL` is a "General" doc, visible to every Group regardless of membership. A doc with `teamId` set is only retrievable inside Groups containing at least one employee from that team.
- **2α Implicit scoping at runtime.** The KB search tool inside a Group computes the allowed team-id set from the conversation's current members (their `agent.teamId` values). General docs (`teamId = NULL`) are always included. The PM and employee LLMs do not see the team scope — it's enforced server-side.
- **Isolation.** This change is Philharmonic-only. Chat does not use `knowledge_doc` today and won't.
- **Out of scope.** Light-RAG, embeddings, similarity ranking. Current `searchKnowledgeDocs` stays a substring stub — just gains a team filter.

## Data model

`knowledge_doc` gains one column:

```ts
teamId: uuid('teamId').references(() => team.id, { onDelete: 'set null' })
```

`ON DELETE SET NULL` means deleting a Team gracefully demotes its docs to General rather than cascading away — important because docs may have business value beyond the team they were attached to.

Existing rows backfill to `teamId = NULL` (General). No data is lost.

## Retrieval contract

```ts
// before
searchKnowledgeDocs(query: string): Promise<Hit[]>

// after
searchKnowledgeDocs(query: string, allowedTeamIds: string[] | null): Promise<Hit[]>
```

- `allowedTeamIds === null` → search every doc (used by global UI lists like the KB page).
- `allowedTeamIds` is an array (possibly empty) → return docs where `teamId IN allowedTeamIds` OR `teamId IS NULL`.

`createSearchKnowledgeBaseTool(allowedTeamIds)` is parameterized at construction time. The PM and the employee loop compute it once before binding tools.

## Group → team set

For a given `conversationId`:

1. Load the conversation's `memberAgentIds`.
2. Load those agents.
3. `allowedTeamIds = unique(agents.map(a => a.teamId).filter(Boolean))`.
4. The KB tool receives this list. General docs join automatically inside the query.

If a Group has no members yet (e.g. the PM hasn't recruited), `allowedTeamIds = []` — only General docs are visible. That's the safe default: it prevents a brand-new Group from accidentally reading a different team's confidential KB.

## API and service

- `POST /api/philharmonic/knowledge` body accepts `teamId: string | null`.
- `GET /api/philharmonic/knowledge` returns `teamId` on each doc.
- `KnowledgeDocData` in the renderer store includes `teamId`.

## UI

KB page (renderer `knowledge-base-page.tsx`):

- **Editor**: a Team picker is added between Title and Body. Options: every team + a "General" option (`teamId = null`, the default).
- **List**: documents are grouped by team, with the General bucket at the top. Each group header uses the same hue icon container as the Workforce page (so a Team's color carries through). Each doc card carries a small team chip next to its title so the binding is obvious even when scrolled mid-team.
- The header summary updates to `{N} documents · {M} teams + General`.

## Out of scope for P0-1

- Edit-team-of-doc UI (you can only set it on create for v1; we'll add inline edit in a follow-up).
- Per-team retrieval ranking, embeddings, deduplication.
- KB browsing from inside a Group (the side panel just shows what the PM searches for).
