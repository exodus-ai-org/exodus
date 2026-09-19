# i18n Phase 2 — `errors` Namespace Wire-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish what the `errors` (core) plan set up but left unused: nest `errors.json`'s `ErrorCode`-derived keys under `errors.code.*` (separating them from camelCase scaffold/component keys before any translation exists), and thread a real i18next instance into all 9 existing `getHttpErrorMessage` call sites via the `toErrorI18n()` adapter — so code-driven HTTP errors actually resolve to translated text instead of the raw English `AppError.message` they still show today.

**Architecture:** `getHttpErrorMessage(err, i18n?)`'s `i18n` parameter has been optional and unused since the core plan shipped it — every call site passes one argument today, silently getting the pre-i18n fallback (`err.hasCustomMessage || !i18n` → always true when `i18n` is omitted → raw `.message`). This plan adds no new translation _content_ — it wires the plumbing that already exists. `useTranslation()` (from `react-i18next`) always returns the same global i18next instance as its `i18n` field regardless of which namespace string you pass it, and the renderer's `createI18n()` (Phase 1) already loads all 13 namespaces upfront — so any component that already calls `useTranslation(...)` for any reason can reach `errors:*` keys for free by also destructuring `i18n` from that same call; components with no existing hook get a minimal `useTranslation('errors')` added.

**Tech Stack:** React 19, `react-i18next` (already wired). No provider changes.

**Spec:** `docs/superpowers/specs/2026-09-11-i18n-design.md` (the "Errors" section). Prior plans for context: `docs/superpowers/plans/2026-09-11-i18n-phase-2-errors-core.md` (merged — introduced `params`/`hasCustomMessage`/`toErrorI18n`; its final review flagged the key-shape question this plan's Task 1 resolves) and `docs/superpowers/plans/2026-09-11-i18n-phase-2-common.md` (merged — established the per-namespace extraction pattern this plan follows).

## Global Constraints

- **No visible change.** Every renderer error message a real user could see today must render byte-identical English text after this plan (the catalog values are unchanged — this plan only makes them reachable, and `en`'s reachable value already equals `AppError.message`'s current fallback text, confirmed by the core plan's parity test).
- **Namespace key shape (Task 1, decided per the errors-core plan's final review):** `errors.json`'s 51 `ErrorCode`-derived keys plus the flat `TIMEOUT` sentinel move under a nested `code` object — `errors.code.<CODE>` — so they stay visually distinct from `errors.somethingWentWrong`, `errors.http.*`, and any future component-scoped camelCase keys this namespace gains. `errors.http.*` and `errors.somethingWentWrong` are NOT renamed — only the flat SCREAMING_SNAKE_CASE keys move.
- **`useTranslation()`'s `i18n` field is namespace-agnostic.** You do not need to add `'errors'` to an existing `useTranslation('common')` call's namespace argument to reach `errors:*` keys through its `i18n` field — only add a namespace argument when you also need `t()` calls against that namespace (none of this plan's edits add any `t()` call).
- **Follow existing patterns:** hooks called at the top of the function body, before any early return; match each file's existing import-grouping style (`oxfmt` reorders automatically).
- **Pre-commit gate unchanged:** `pnpm format` → `pnpm lint` → `pnpm typecheck` → `pnpm i18n:check` → `pnpm test`. `--no-verify` only for the documented PGlite WASM teardown flake.
- **Out of scope for this plan (deliberately deferred, per the errors-core plan's own final review):** extracting the ~57 `sileo.error()`/inline-error renderer literals that are unrelated to `AppError`/`getHttpErrorMessage` (raw client-side validation, generic "something went wrong" toasts, etc.) — a separate, `common`-shaped mechanical pass; and expanding `ErrorCode` for the ~30 server-side call sites whose custom override text differs from their code's default — a taxonomy decision, not urgent.

---

### Task 1: Nest `errors.json`'s `ErrorCode` keys under `code.*`

**Files:**

- Modify: `src/shared/i18n/locales/en/errors.json`
- Modify: `src/shared/utils/http.ts`
- Modify: `tests/unit/i18n/errors-namespace.test.ts`
- Modify: `tests/unit/shared/utils/http.test.ts`

**Interfaces:**

- Consumes: `ErrorCode` (unchanged, from `src/shared/constants/error-codes.ts`).
- Produces: `errors.json`'s new shape `{ somethingWentWrong, http: {...}, code: { <51 ErrorCode keys>, TIMEOUT } }`; `getHttpErrorMessage`'s code-lookup key becomes `` `errors:code.${err.code}` `` (its `errors:http.<status>`/`errors:http.unknown` fallback keys are UNCHANGED — only the code-lookup line moves). Later tasks in this plan don't touch this shape further — they only call `toErrorI18n(i18n)`, which is a black box to them.

- [ ] **Step 1: Write the failing tests**

Replace `tests/unit/i18n/errors-namespace.test.ts` in full with:

```ts
import { readFileSync } from 'fs'
import { join } from 'path'

import { ErrorCode, ErrorMessages } from '@shared/constants/error-codes'
import { describe, expect, it } from 'vitest'

const errors = JSON.parse(
  readFileSync(
    join(
      __dirname,
      '..',
      '..',
      '..',
      'src',
      'shared',
      'i18n',
      'locales',
      'en',
      'errors.json'
    ),
    'utf8'
  )
)

describe('errors namespace (en)', () => {
  it('has one non-empty key under `code` for every ErrorCode member', () => {
    for (const code of Object.values(ErrorCode)) {
      expect(typeof errors.code[code]).toBe('string')
      expect(errors.code[code].length).toBeGreaterThan(0)
    }
  })

  it('keeps the Phase 1 scaffold keys at the top level (not nested under code)', () => {
    expect(errors.somethingWentWrong).toBe(
      'Something went wrong. Please try again.'
    )
    expect(errors.http.unknown).toBe('Request failed.')
  })

  it('rounds out the http-status fallback set', () => {
    expect(typeof errors.http['400']).toBe('string')
    expect(typeof errors.http['404']).toBe('string')
    expect(typeof errors.http['408']).toBe('string')
    expect(typeof errors.http['429']).toBe('string')
    expect(errors.http['500']).toBe('The server ran into a problem.')
    expect(errors.http['503']).toBe('The service is temporarily unavailable.')
  })

  it('has a TIMEOUT key under `code` for the client-only fetch-abort case', () => {
    expect(errors.code.TIMEOUT).toBe('Request timed out.')
  })

  it('interpolates params for the four templated codes', () => {
    expect(errors.code[ErrorCode.CONFIG_MISSING_API_KEY]).toContain('{{label}}')
    expect(errors.code[ErrorCode.VALIDATION_MISSING_FIELD]).toContain(
      '{{field}}'
    )
    expect(errors.code[ErrorCode.DEEP_RESEARCH_NOT_FOUND]).toContain('{{id}}')
    expect(errors.code[ErrorCode.MEMORY_NOT_FOUND]).toContain('{{id}}')
  })

  it('matches ErrorMessages verbatim for every ErrorCode (single source of truth)', () => {
    for (const code of Object.values(ErrorCode)) {
      expect(errors.code[code]).toBe(ErrorMessages[code])
    }
  })
})
```

Add to `tests/unit/shared/utils/http.test.ts`'s `fakeI18n` object (the `describe('getHttpErrorMessage with an i18n instance', ...)` block) — this test file's fake stub currently hardcodes the OLD un-nested keys; the failing-test step is simply that these strings won't match once Step 3 below changes `getHttpErrorMessage`'s actual lookup key. No new test cases are needed here — Step 3 will require editing the existing fake's key strings, which is covered under Step 3 below (not a separate RED step, since it's a one-to-one key-string substitution, not new behavior to design).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/i18n/errors-namespace.test.ts`
Expected: FAIL — `errors.code` is `undefined` (the JSON hasn't been restructured yet), so every `errors.code[...]` access throws or returns `undefined`.

- [ ] **Step 3: Restructure `errors.json` and update `getHttpErrorMessage`**

Replace the full contents of `src/shared/i18n/locales/en/errors.json` with:

```json
{
  "somethingWentWrong": "Something went wrong. Please try again.",
  "http": {
    "unknown": "Request failed.",
    "400": "The request could not be processed.",
    "404": "The requested resource could not be found.",
    "408": "Request timed out.",
    "429": "Too many requests. Please try again later.",
    "500": "The server ran into a problem.",
    "503": "The service is temporarily unavailable."
  },
  "code": {
    "TIMEOUT": "Request timed out.",
    "CONFIG_MISSING_OPENAI": "OpenAI configuration is missing. Please configure OpenAI API key in settings.",
    "CONFIG_MISSING_EMBEDDING_MODEL": "Embedding model is missing. Please check your settings.",
    "CONFIG_MISSING_CHAT_MODEL": "Chat model is missing. Please configure a chat model in settings.",
    "CONFIG_MISSING_REASONING_MODEL": "Reasoning model is missing. Please configure a reasoning model in settings.",
    "CONFIG_MISSING_PROVIDER": "No AI provider selected. Please choose a provider in Settings → AI Providers.",
    "CONFIG_MISSING_BRAVE": "Web search requires a Brave Search API key. Please configure it in Settings → Web Search.",
    "CONFIG_MISSING_S3": "S3 configuration is incomplete. Please configure AWS credentials in settings.",
    "CONFIG_MISSING_S3_BUCKET": "S3 bucket is not configured. Please check your settings.",
    "CONFIG_MISSING_API_KEY": "{{label}} is not configured. Please add it in Settings → AI Providers before chatting.",
    "CONFIG_INVALID": "Configuration is invalid. Please check your settings.",
    "CHAT_NOT_FOUND": "Chat not found.",
    "MESSAGE_NOT_FOUND": "Message not found.",
    "RESOURCE_NOT_FOUND": "Resource not found.",
    "SETTING_NOT_FOUND": "Settings not found. Please restart the app.",
    "DEEP_RESEARCH_NOT_FOUND": "Deep research with ID {{id}} not found.",
    "AGENT_NOT_FOUND": "Agent or department not found.",
    "TASK_NOT_FOUND": "Task not found.",
    "MEMORY_NOT_FOUND": "Memory {{id}} not found.",
    "PROJECT_NOT_FOUND": "Project not found.",
    "SKILL_NOT_FOUND": "Skill not found.",
    "AUDIO_NOT_FOUND": "Audio file not found.",
    "VALIDATION_FAILED": "Input validation failed.",
    "VALIDATION_NO_USER_MESSAGE": "No user message found in the request.",
    "VALIDATION_INVALID_INPUT": "Invalid input provided.",
    "VALIDATION_MISSING_FIELD": "{{field}} is required.",
    "KNOWLEDGE_BASE_NOT_CONFIGURED": "The knowledge base is not configured.",
    "RATE_LIMIT_CHAT": "You have exceeded your maximum number of messages. Please try again later.",
    "RATE_LIMIT_SKILLS": "Too many requests to the skill registry. Please try again later.",
    "SERVICE_OLLAMA_UNREACHABLE": "Ollama service is not reachable. Please check if Ollama is running.",
    "SERVICE_OPENAI_FAILED": "OpenAI service failed. Please try again later.",
    "SERVICE_S3_FAILED": "S3 service failed. Please try again later.",
    "SERVICE_S3_UPLOAD_FAILED": "Failed to upload file to S3. Please check your S3 configuration.",
    "SERVICE_S3_PRESIGN_FAILED": "Failed to generate S3 presigned URL. Please check your S3 configuration.",
    "SERVICE_MCP_FAILED": "MCP service failed. Please check your MCP configuration.",
    "SERVICE_UNAVAILABLE": "External service is unavailable. Please try again later.",
    "DB_QUERY_FAILED": "Database query failed.",
    "DB_CONNECTION_FAILED": "Failed to connect to database.",
    "DB_SAVE_FAILED": "Failed to save to database.",
    "DB_DELETE_FAILED": "Failed to delete from database.",
    "DB_IMPORT_FAILED": "Failed to import data.",
    "DB_EXPORT_FAILED": "Failed to export data.",
    "FILE_READ_FAILED": "Failed to read file.",
    "FILE_WRITE_FAILED": "Failed to write file.",
    "FILE_UPLOAD_FAILED": "Failed to upload file.",
    "PDF_GENERATION_FAILED": "Failed to generate PDF.",
    "AI_STREAM_FAILED": "AI streaming failed.",
    "AI_GENERATION_FAILED": "AI generation failed.",
    "AI_EMBEDDING_FAILED": "AI embedding generation failed.",
    "INTERNAL_ERROR": "Internal server error occurred.",
    "UNKNOWN_ERROR": "An unknown error occurred.",
    "APP_LOCKED": "Application is locked."
  }
}
```

(This is exactly the prior file's `TIMEOUT` and 51 `ErrorCode` entries moved under a new `code` key, with `somethingWentWrong` and `http` left exactly where they were. Every value is byte-identical to before — only the JSON structure changed.)

In `src/shared/utils/http.ts`, find this line inside `getHttpErrorMessage` (it currently reads `errors:${err.code}` — the colon form fixed by the prior plan's final-review fix wave):

```ts
const codeKey = `errors:${err.code}`
```

Replace it with:

```ts
const codeKey = `errors:code.${err.code}`
```

Do NOT change the two lines below it (`` `errors:http.${err.statusCode}` `` and `'errors:http.unknown'`) — those keys are unaffected by this restructure.

Now fix `tests/unit/shared/utils/http.test.ts`'s `fakeI18n` object (in the `describe('getHttpErrorMessage with an i18n instance', ...)` block) to match the new key shape. Replace:

```ts
const fakeI18n = {
  exists: (key: string) =>
    [
      'errors:MEMORY_NOT_FOUND',
      'errors:http.404',
      'errors:http.unknown'
    ].includes(key),
  t: (key: string, params?: Record<string, string | number>) => {
    if (key === 'errors:MEMORY_NOT_FOUND')
      return `Memory ${params?.id} not found (translated).`
    if (key === 'errors:http.404') return 'Not found (translated).'
    if (key === 'errors:http.unknown') return 'Unknown failure (translated).'
    return key
  }
}
```

with:

```ts
const fakeI18n = {
  exists: (key: string) =>
    [
      'errors:code.MEMORY_NOT_FOUND',
      'errors:http.404',
      'errors:http.unknown'
    ].includes(key),
  t: (key: string, params?: Record<string, string | number>) => {
    if (key === 'errors:code.MEMORY_NOT_FOUND')
      return `Memory ${params?.id} not found (translated).`
    if (key === 'errors:http.404') return 'Not found (translated).'
    if (key === 'errors:http.unknown') return 'Unknown failure (translated).'
    return key
  }
}
```

(Only the `MEMORY_NOT_FOUND` key strings change — `errors:http.404`/`errors:http.unknown` are untouched, matching `http.ts`'s unchanged fallback lines above. The two real-`createI18n()`-instance tests in the same file, in the `describe('getHttpErrorMessage against a real i18n instance', ...)` block, need NO changes — they never hardcode a key string; they call `getHttpErrorMessage(err, toErrorI18n(i18n))` and assert on the returned text, which is unaffected by where the key physically lives in the catalog.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/i18n/errors-namespace.test.ts tests/unit/shared/utils/http.test.ts`
Expected: PASS, all tests green (9 in `errors-namespace.test.ts`... actually 6 `it`s; 10 in `http.test.ts`).

- [ ] **Step 5: Run the full gate**

Run: `pnpm typecheck && pnpm lint && npx vitest run && pnpm i18n:check`
Expected: all green. `pnpm i18n:audit` is unaffected by this task (no renderer file touched).

- [ ] **Step 6: Commit**

```bash
git add src/shared/i18n/locales/en/errors.json src/shared/utils/http.ts tests/unit/i18n/errors-namespace.test.ts tests/unit/shared/utils/http.test.ts
git commit -m "refactor(i18n): nest errors.json's ErrorCode keys under code.*"
```

---

### Task 2: Wire `toErrorI18n` into `knowledge-base.tsx`'s 5 call sites

**Files:**

- Modify: `src/renderer/components/settings/settings-form/knowledge-base.tsx`

**Interfaces:**

- Consumes: `toErrorI18n` (exported from `src/shared/utils/http.ts`, from the errors-core plan); each site's own existing `const { t } = useTranslation('common')` call.
- Produces: nothing new for later tasks.

This file already has 3 separate `useTranslation('common')` calls (one per component — `DocDialog`, `DocListItem`, `KnowledgeBase`), from the `common` namespace pass. `DocListItem` has no `getHttpErrorMessage` call and is untouched by this task. The other two need `i18n` added to their existing destructuring.

- [ ] **Step 1: `DocDialog` — add `i18n`, wire its 1 call site**

Read the file first to confirm current line numbers (they may have drifted a line or two). Find, inside `DocDialog`:

```ts
function DocDialog({ open, doc, onClose, onSaved }: DocDialogProps) {
  const { t } = useTranslation('common')
```

Replace with:

```ts
function DocDialog({ open, doc, onClose, onSaved }: DocDialogProps) {
  const { t, i18n } = useTranslation('common')
```

Then find, inside the same component's `handleSave`'s `catch` block:

```ts
    } catch (e) {
      sileo.error({
        title: 'Failed to save document',
        description: getHttpErrorMessage(e)
      })
    }
```

Replace with:

```ts
    } catch (e) {
      sileo.error({
        title: 'Failed to save document',
        description: getHttpErrorMessage(e, toErrorI18n(i18n))
      })
    }
```

- [ ] **Step 2: `KnowledgeBase` — add `i18n`, wire its 4 call sites**

Find:

```ts
export function KnowledgeBase({ form }: { form: UseFormReturnType }) {
  const { t } = useTranslation('common')
```

Replace with:

```ts
export function KnowledgeBase({ form }: { form: UseFormReturnType }) {
  const { t, i18n } = useTranslation('common')
```

Then find each of these 4 sites within `KnowledgeBase` (in `loadDocs`, `handleTest`, `handleReindex`, `confirmDelete` respectively — locate each by its `title:` string, since all 4 share the identical `getHttpErrorMessage(e)` call shape) and add the same 2nd argument:

```ts
sileo.error({
  title: 'Failed to load documents',
  description: getHttpErrorMessage(e)
})
```

→

```ts
sileo.error({
  title: 'Failed to load documents',
  description: getHttpErrorMessage(e, toErrorI18n(i18n))
})
```

```ts
sileo.error({
  title: 'Failed to connect',
  description: getHttpErrorMessage(e)
})
```

→

```ts
sileo.error({
  title: 'Failed to connect',
  description: getHttpErrorMessage(e, toErrorI18n(i18n))
})
```

```ts
sileo.error({
  title: 'Failed to reindex',
  description: getHttpErrorMessage(e)
})
```

→

```ts
sileo.error({
  title: 'Failed to reindex',
  description: getHttpErrorMessage(e, toErrorI18n(i18n))
})
```

```ts
sileo.error({
  title: 'Failed to delete document',
  description: getHttpErrorMessage(e)
})
```

→

```ts
sileo.error({
  title: 'Failed to delete document',
  description: getHttpErrorMessage(e, toErrorI18n(i18n))
})
```

- [ ] **Step 3: Add the `toErrorI18n` import**

Find the file's existing import of `getHttpErrorMessage`:

```ts
import { getHttpErrorMessage } from '@shared/utils/http'
```

Replace with:

```ts
import { getHttpErrorMessage, toErrorI18n } from '@shared/utils/http'
```

(If the actual import line differs slightly — e.g. imports more names from the same module — add `toErrorI18n` to that same named-import list rather than creating a second import statement.)

- [ ] **Step 4: Run the full gate**

Run: `pnpm typecheck && pnpm lint && npx vitest run && pnpm i18n:check`
Expected: all green. No existing test asserts on this file's toast text (confirmed: no test file references `knowledge-base.tsx`'s component internals beyond what Phase 2 `common`'s own task review already checked).

- [ ] **Step 5: Manual smoke (if a dev environment is available)**

Open Settings → Knowledge Base, trigger a failure on each of the 5 paths (save/load/test-connection/reindex/delete with the server unreachable, e.g. by stopping the app's own server mid-request or hitting a 4xx). Expected: toast description text is unchanged from before this plan (still reads whatever `AppError.message` produces for that code — same English, now routed through the translated-lookup path instead of a bare `err.message` read that happened to equal it).

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/settings/settings-form/knowledge-base.tsx
git commit -m "feat(i18n): wire real translation into knowledge-base.tsx's error toasts"
```

---

### Task 3: Wire `toErrorI18n` into the remaining 3 files (4 call sites)

**Files:**

- Modify: `src/renderer/components/settings/settings-form/full-text-search.tsx`
- Modify: `src/renderer/components/home/discover-feed.tsx`
- Modify: `src/renderer/hooks/use-settings.ts`

**Interfaces:**

- Consumes: `toErrorI18n` (from `src/shared/utils/http.ts`); `useTranslation` (from `react-i18next`) — none of these 3 files has an existing i18n hook, so each needs a fresh one added.
- Produces: nothing new for later tasks. This is the last extraction batch for this plan.

- [ ] **Step 1: `full-text-search.tsx` — 2 sites**

Read the file first to confirm current line numbers. Add the import and hook. Find:

```ts
import { TEST_IDS } from '@shared/constants/test-ids'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { fetcher, getHttpErrorMessage } from '@shared/utils/http'
import { AlertCircleIcon } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { sileo } from 'sileo'
```

Replace with:

```ts
import { TEST_IDS } from '@shared/constants/test-ids'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { fetcher, getHttpErrorMessage, toErrorI18n } from '@shared/utils/http'
import { AlertCircleIcon } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { sileo } from 'sileo'
```

Find:

```ts
export function FullTextSearch({ form }: { form: UseFormReturnType }) {
  const [isTesting, setIsTesting] = useState(false)
  const [isReindexing, setIsReindexing] = useState(false)
```

Replace with:

```ts
export function FullTextSearch({ form }: { form: UseFormReturnType }) {
  const { i18n } = useTranslation('errors')
  const [isTesting, setIsTesting] = useState(false)
  const [isReindexing, setIsReindexing] = useState(false)
```

Find:

```ts
sileo.error({
  title: 'Failed to connect to Elasticsearch',
  description: getHttpErrorMessage(err)
})
```

Replace with:

```ts
sileo.error({
  title: 'Failed to connect to Elasticsearch',
  description: getHttpErrorMessage(err, toErrorI18n(i18n))
})
```

Find:

```ts
sileo.error({
  title: 'Failed to reindex messages',
  description: getHttpErrorMessage(err)
})
```

Replace with:

```ts
sileo.error({
  title: 'Failed to reindex messages',
  description: getHttpErrorMessage(err, toErrorI18n(i18n))
})
```

- [ ] **Step 2: `discover-feed.tsx` — 1 site**

Read the file first. Add the `useTranslation`/`toErrorI18n` imports (follow the file's existing import-grouping style — `oxfmt` will sort exact placement). Find the `DiscoverFeed` component's hook block:

```ts
export function DiscoverFeed() {
  const { data: settings } = useSettings()
  const enabled = settings?.discover?.enabled ?? false
  const { feed, mutate } = useDiscoverFeed(enabled)
  const [refreshing, setRefreshing] = useState(false)
  const kickedInitialRefresh = useRef(false)
```

Replace with:

```ts
export function DiscoverFeed() {
  const { i18n } = useTranslation('errors')
  const { data: settings } = useSettings()
  const enabled = settings?.discover?.enabled ?? false
  const { feed, mutate } = useDiscoverFeed(enabled)
  const [refreshing, setRefreshing] = useState(false)
  const kickedInitialRefresh = useRef(false)
```

(This must go before the component's early return — `if (!enabled || !feed || feed.groups.length === 0) return null` — further down; placing it as the very first hook, as shown, satisfies that.)

Find:

```ts
sileo.error({
  title: 'Failed to refresh',
  description: getHttpErrorMessage(e)
})
```

Replace with:

```ts
sileo.error({
  title: 'Failed to refresh',
  description: getHttpErrorMessage(e, toErrorI18n(i18n))
})
```

Add `toErrorI18n` to this file's existing `getHttpErrorMessage` import, and add `import { useTranslation } from 'react-i18next'` alongside the file's other imports.

- [ ] **Step 3: `use-settings.ts` — 1 site**

Read the file first (it's the whole file, only 41 lines). Replace:

```ts
import type { Settings } from '@shared/schemas/settings-schema'
import { getHttpErrorMessage } from '@shared/utils/http'
import { sileo } from 'sileo'
import useSWR from 'swr'

import { updateSettings as updateSettingsService } from '@/services/settings'

export function useSettings() {
  const { data, error, isLoading, mutate } = useSWR<Settings>('/api/settings')

  const updateSettings = async (payload: Settings) => {
    try {
      await updateSettingsService(payload)
    } catch (err) {
      sileo.error({
        title: 'Failed to save settings',
        description: getHttpErrorMessage(err)
      })
      return
    }
```

with:

```ts
import type { Settings } from '@shared/schemas/settings-schema'
import { getHttpErrorMessage, toErrorI18n } from '@shared/utils/http'
import { useTranslation } from 'react-i18next'
import { sileo } from 'sileo'
import useSWR from 'swr'

import { updateSettings as updateSettingsService } from '@/services/settings'

export function useSettings() {
  const { i18n } = useTranslation('errors')
  const { data, error, isLoading, mutate } = useSWR<Settings>('/api/settings')

  const updateSettings = async (payload: Settings) => {
    try {
      await updateSettingsService(payload)
    } catch (err) {
      sileo.error({
        title: 'Failed to save settings',
        description: getHttpErrorMessage(err, toErrorI18n(i18n))
      })
      return
    }
```

- [ ] **Step 4: Run the full gate**

Run: `pnpm typecheck && pnpm lint && npx vitest run && pnpm i18n:check`
Expected: all green.

- [ ] **Step 5: Manual smoke (if a dev environment is available)**

Trigger a failure on: Elasticsearch test-connection, Elasticsearch reindex, Discover feed refresh (e.g. with web search misconfigured), and a settings save (e.g. an invalid provider config). Expected: toast description text unchanged from before this plan.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/settings/settings-form/full-text-search.tsx src/renderer/components/home/discover-feed.tsx src/renderer/hooks/use-settings.ts
git commit -m "feat(i18n): wire real translation into the remaining getHttpErrorMessage call sites"
```

---

### Task 4: Verify the wire-up is complete

**Files:**

- None modified — verification only.

**Interfaces:**

- Consumes: `pnpm i18n:audit`, `pnpm i18n:check`, the full test suite.
- Produces: a confirmation all 9 `getHttpErrorMessage` call sites are now translation-capable; no new artifacts for later tasks.

- [ ] **Step 1: Confirm all 9 call sites now pass an `i18n` argument**

Run: `grep -rn "getHttpErrorMessage(" src/renderer/`
Expected: all 9 matches (5 in `knowledge-base.tsx`, 2 in `full-text-search.tsx`, 1 in `discover-feed.tsx`, 1 in `use-settings.ts`) now show `getHttpErrorMessage(<err>, toErrorI18n(i18n))` — none left as a single-argument call.

- [ ] **Step 2: Full gate one more time**

Run: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm i18n:check && pnpm test`
Expected: everything green across all 3 commits in this plan combined. (If `pnpm format:check` reports issues in files this plan never touched, that's pre-existing unrelated working-tree state — see Phase 2 `common`'s and `errors (core)`'s Task 6 precedent; do not attempt to fix files outside this plan's file list.)

- [ ] **Step 3: Confirm the audit numbers are unmoved**

Run: `pnpm i18n:audit`
Expected: both `JSX text nodes` and `toast titles` counts are unchanged from wherever `errors (core)`'s Task 6 left them — this plan adds `i18n`/`toErrorI18n` plumbing to existing calls but doesn't touch any `title:`/JSX-text literal (those 57 sites are the deliberately-deferred follow-up plan's job).

- [ ] **Step 4: No commit** — this task is verification-only; nothing to stage.

---

## Self-Review

**1. Spec coverage:** the design spec's "Errors" section's `getHttpErrorMessage(e) → i18n.t(...)` target is now fully realized at every existing call site, not just plumbed-but-unused as the core plan left it. The namespace key-shape question the core plan's final review flagged is resolved by Task 1.

**2. Placeholder scan:** every step names an exact file, exact current code (re-read from the live tree while writing this plan, not from memory of an earlier survey), and exact replacement code. No step says "similar to Task N" without repeating the full code.

**3. Type consistency:** `toErrorI18n(i18n)` is called identically at every one of the 9 sites — same import name, same call shape, same 2nd-argument position — matching the errors-core plan's own exported signature `toErrorI18n(instance: I18nInstance): ErrorI18n` with no drift.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-12-i18n-phase-2-errors-wireup.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
