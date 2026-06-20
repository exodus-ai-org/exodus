# Test-ID Traceability ("Checkpoints") — Design

Date: 2026-06-20
Status: Approved (design), pending implementation plan

## Summary

Give every key interactive element a **stable, semantic `data-testid`** drawn
from a typed registry, drive Playwright E2E tests off those ids, **strip the
attributes only from packaged release builds**, and **enforce the code↔test
linkage** so coverage can't silently drift. The result is precise tracking of
"feature point → element → test → expected effect".

This is the off-the-shelf realization of the "checkpoint" idea: the checkpoint
lives in the **id value**, not an opaque hash. We reuse `data-testid`
(Playwright-native), `babel-plugin-react-remove-properties` (React's standard
strip), the existing Playwright setup, and Vitest for enforcement — no custom
build plugin, no new test runner.

## Goals

- A single, typed catalog of test ids (the "feature-point" list).
- Stable ids that survive edits/regeneration (a durable contract, not a hash).
- Markers present in dev and **all test/E2E builds**; removed only from
  packaged releases.
- Automated enforcement of the bidirectional link (no orphan ids, no uncovered
  ids, no dangling test refs).
- A pilot (the lock feature) proving the full loop end-to-end.
- A written convention for how UI generation adds a marker + a test.

## Non-goals

- Opaque/content-hash ids (rejected: unstable or unreadable — see Decisions).
- A code generator/scaffold command that mints marker+test together (possible
  later; v1 is a documented convention).
- Component-level tests via Testing Library/jsdom (not in the repo today;
  markers drive the existing Playwright E2E instead).
- Retrofitting test ids across the whole app (only the lock pilot in v1;
  broader rollout follows the convention over time).

## Decisions (and rejected alternatives)

- **Attribute = `data-testid`.** Playwright's `getByTestId` uses it by default,
  so no Playwright config. (If a literal `data-checkpoint` attribute is ever
  preferred, it's a one-line `testIdAttribute` change — out of scope here.)
- **Id value = semantic, namespaced `feature.element`** (e.g.
  `lock.unlock-button`). Rejected: a content-hash changes on every edit and
  breaks tests; a content-independent hash is just an unreadable testid. A
  semantic id is stable, greppable, and self-documenting.
- **Ids are a durable contract.** Once written, an id is not regenerated;
  editing a component preserves its id. New elements mint new ids.
- **Strip is release-only and opt-in** (`STRIP_TEST_IDS=1`), so the E2E build —
  which runs against `out/` — always keeps markers.

## Architecture

```
 TEST_IDS registry (typed catalog)
   │  referenced by
   ├──▶ renderer components  (data-testid={TEST_IDS.lock.unlockButton})
   └──▶ Playwright E2E tests (page.getByTestId(TEST_IDS.lock.unlockButton))
                    │
 linkage test (Vitest) ◀── globs src/ + tests/, asserts the three-way link
                    │
 release build ──▶ babel-plugin-react-remove-properties (STRIP_TEST_IDS=1)
                    strips data-testid from packaged output only
```

### 1. Id registry — `src/shared/constants/test-ids.ts`

A nested `as const` object of dotted string literals, grouped by feature.

```ts
export const TEST_IDS = {
  lock: {
    pinInput: 'lock.pin-input',
    touchIdButton: 'lock.touchid-button',
    idleSelect: 'lock.idle-select',
    enablePinInput: 'lock.enable-pin-input',
    confirmPinInput: 'lock.confirm-pin-input',
    removeButton: 'lock.remove-button'
  }
} as const
```

- Lives in `@shared` so both renderer and tests import the same literals.
- Convention: the dotted value mirrors the object path (`lock.pinInput` →
  `'lock.pin-input'`), checked by the linkage test.
- Components spread it directly: `data-testid={TEST_IDS.lock.idleSelect}`.

### 2. Release-only strip — `electron.vite.config.ts`

Add the Babel plugin to the existing `react()` call, gated on an env flag:

```ts
const stripTestIds = process.env.STRIP_TEST_IDS === '1'
// ...
react({
  babel: {
    plugins: stripTestIds
      ? [['react-remove-properties', { properties: ['data-testid'] }]]
      : []
  }
})
```

Wire the flag into the release scripts only (via `cross-env`, a new devDep):

```jsonc
"build:mac":   "cross-env STRIP_TEST_IDS=1 electron-vite build && electron-builder --mac",
"build:win":   "cross-env STRIP_TEST_IDS=1 electron-vite build && electron-builder --win",
"build:linux": "cross-env STRIP_TEST_IDS=1 electron-vite build && electron-builder --linux"
```

`build`, `build:unpack`, `dev`, and the E2E build keep `data-testid`. (Note:
`build:mac/win/linux` currently call `electron-vite build` directly, not the
`build` script, so this does not double-run typecheck differently than today.)

### 3. Linkage enforcement — `src/shared/constants/test-ids.linkage.test.ts`

A Vitest test (runs in `pnpm test` and the pre-commit hook) that:

1. Flattens `TEST_IDS` to the set of declared ids; asserts each value matches
   its object path (naming convention) and all values are unique.
2. Globs `src/renderer/**/*.tsx`, collecting ids **applied** as
   `data-testid={TEST_IDS.…}` (and any raw `data-testid="…"`). Asserts:
   - every declared id is applied somewhere (**no orphan registry entries**),
   - no raw string `data-testid` bypasses the registry (**registry is the only
     source**).
3. Globs `tests/**/*.spec.ts`, collecting ids referenced via
   `getByTestId(TEST_IDS.…)` (or `TEST_IDS.…` usage). Asserts:
   - every applied id is referenced by ≥1 test (**no uncovered checkpoint**),
   - every referenced id is declared (**no dangling ref**).
4. On failure, lists offending ids per category.

Implemented with `node:fs` + a small glob (e.g. `tinyglobby`, already transitive
via Vite, or `fast-glob` if present) — no new heavy dep. The test reads files as
text and matches with anchored regexes; it does not execute renderer code (so it
stays Electron/PGlite-free per the repo's test rules).

### 4. Pilot: lock feature retrofit + E2E

- Add `data-testid={TEST_IDS.lock.*}` to: the lock-screen `PinInput`, the Touch
  ID button; and in Lock & Privacy: the enable/confirm `PinInput`s, the idle
  `Select`, the remove button.
- `tests/e2e/lock-e2e.spec.ts` (Playwright `e2e` project) drives the real loop
  against the built app: open settings → General → set a 6-digit PIN (two-step)
  → trigger lock → assert the lock screen shows and `GET /api/settings` returns
  **423** → enter the PIN via the OTP field → assert the app returns and
  `/api/settings` returns **200**. Reuses `tests/fixtures/electron.ts` and the
  existing API-client/settings-inject helpers.
- This satisfies the lock feature's outstanding manual-verification (Task 15).

### 5. AI co-gen convention — `CLAUDE.md`

A short subsection: when adding/generating an interactive element, (a) add a
`TEST_IDS` entry, (b) spread it as `data-testid`, (c) add or extend a Playwright
test that references it via `getByTestId(TEST_IDS.…)`. The linkage test enforces
this; the doc explains it.

## Data flow

- **Author/AI** adds an id to `TEST_IDS`, applies it on the element, references
  it in a test.
- **`pnpm test`** runs the linkage test → fails if any of the three links is
  missing.
- **`pnpm test:e2e:electron`** runs Playwright against `out/` (markers present)
  → exercises real behavior via the ids.
- **`pnpm build:mac/win/linux`** sets `STRIP_TEST_IDS=1` → packaged app has no
  `data-testid`.

## Error handling / edge cases

- **E2E build must not strip:** guaranteed by opt-in flag set only in release
  scripts; the `e2e` fixture's `electron-vite build` keeps markers.
- **Hydration/SSR:** N/A — Electron renderer is client-only; stripping happens
  uniformly at build.
- **Sub-apps** (searchbar, quick-chat, artifacts) build through the same
  renderer config, so they strip consistently in release.
- **Raw `data-testid` strings** are rejected by the linkage test to keep the
  registry authoritative (a deliberate constraint; escape hatch is adding to the
  registry).
- **Uncovered id during incremental work:** the linkage test fails fast, telling
  the author exactly which id needs a test (or to remove the marker).

## Testing

- The linkage test is itself the enforcement; add focused unit assertions for
  the flatten/naming/uniqueness helpers.
- The lock E2E spec validates the end-to-end loop.
- `pnpm typecheck` covers the registry/types; `pnpm lint` covers style.

## Rollout / future

- Broaden `TEST_IDS` to other features over time, following the convention.
- Optional later: a `data-checkpoint` attribute rename, a scaffold command, or
  component-level tests (Testing Library) if faster feedback is wanted.
