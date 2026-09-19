# i18n Phase 2 — `chat` namespace (core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract every hardcoded English string in the composer, message list,
TOC, message actions, thinking timeline, and LCM status card into the `chat`
i18n namespace, wired through `t()` / `<Trans>` / the raw renderer `i18n`
instance — matching the rigor already applied to `common`, `errors`, and
`menu`.

**Architecture:** `chat.json` already exists with one populated section
(`imageGeneration`, added by unrelated concurrent work — untouched here). This
plan adds the remaining sections next to it. Components/hooks call
`useTranslation('chat')` (or the two-namespace array form where a file already
consumes `common`); plain, non-component/non-hook helper functions import the
shared renderer `i18n` singleton directly (`@/lib/i18n`) and call
`i18n.t('chat:key', …)` — the same shape `mainT()` established for the main
process, adapted to the renderer's existing exported instance.

**Tech Stack:** React 19, react-i18next v17, i18next v26 (built-in
`Intl.PluralRules` CLDR pluralization, no plugin), Vitest v4.

**Spec:** `docs/superpowers/specs/2026-09-11-i18n-design.md` (`chat` namespace
scope, line 121: composer, message list, tabs, TOC, regenerate, tool-call
cards, LCM status — renderer-only).

## Global Constraints

- English only. Do not touch any locale other than `en` — non-English
  catalogs are filled by the later machine-translation pass.
- i18next's separators are never overridden project-wide:
  `nsSeparator: ':'`, `keySeparator: '.'`. Any lookup that crosses a namespace
  boundary (a `<Trans ns="…">`, a raw `i18n.t(...)` call, a bare `t()` call
  reading from a non-default namespace inside an array-form
  `useTranslation([...])`) MUST use the explicit `ns:key` form. A bare key
  inside a component's own `useTranslation('chat')` omits the `chat:` prefix.
- CLDR plurals: suffix `_one` / `_other` on the JSON key, call
  `t('key', { count })`. i18next v26 resolves this via `Intl.PluralRules`
  with no extra config — already relied on by this plan's new
  `tests/unit/i18n/chat-namespace.test.ts` (Task 1).
- Renderer, plain functions that are **not** components or hooks (module-level
  helpers such as `getToolCallPreview`, `formatDuration`, or an exported
  service function in `src/renderer/services/*.ts`) cannot call
  `useTranslation()`. They import the shared instance directly:
  `import { i18n } from '@/lib/i18n'` → `i18n.t('chat:key', params)`. This
  instance is already used exactly this way and already covered by
  `tests/unit/i18n/renderer-i18n.test.ts` — Task 1 documents the pattern in
  CLAUDE.md.
- Two-namespace hook pattern (first real use in this codebase, in Task 3):
  when a file already has `useTranslation('common')` and needs `chat` keys
  too, switch to `useTranslation(['common', 'chat'])`, keeping the existing
  namespace **first** — so every already-written bare `t('key')` call keeps
  resolving against `common` unchanged — and prefix every new lookup with
  `chat:`.
- `chat.tsx`'s `onError` toast ("Something went wrong" /
  "An error occurred, please try again!", lines 109-117) is **out of scope**
  for this plan. It's a generic `sileo.error()` shape near-identical to the
  `errors:somethingWentWrong` scaffold key, not real "chat" vocabulary — the
  same class of site the `errors-core` and `errors-wireup` plans' final
  reviews already deferred to a future generic-toast-extraction pass. Do not
  modify `chat.tsx` in this plan.
- Before extracting a string into an existing function scope, check whether
  that scope already binds a local `t` (CLAUDE.md's i18n step 7,
  `composer-tools.tsx`'s `ActiveToolPills` already renames a filter variable
  from `t` to `tool` for exactly this reason — keep that rename as-is).
- Pre-commit gate: `pnpm format` → `pnpm lint` → `pnpm typecheck` →
  `pnpm i18n:check` → `pnpm test`. The only pre-verified `--no-verify`
  exceptions on this project are (a) the PGlite WASM teardown flake in
  `src/main/lib/ai/context-management/index.test.ts`, and (b) the orphan
  `TEST_IDS.providerModels.modelSelect` test id sitting in the user's own
  uncommitted `model-picker.tsx` WIP. Re-verify the exact cause yourself
  before invoking either — never `--no-verify` for anything else.
- `src/renderer/components/ui/**` stays out of scope (shadcn-generated,
  overwritten by `pnpm shadcn:generate`).

---

### Task 1: `chat.json` catalog, CLAUDE.md convention docs, catalog test

**Files:**

- Modify: `src/shared/i18n/locales/en/chat.json`
- Modify: `CLAUDE.md:494-511`
- Create: `tests/unit/i18n/chat-namespace.test.ts`

**Interfaces:**

- Produces: every JSON key path used by Tasks 2-6 (listed in full below). No
  other task may invent a key not listed here — if one turns out to be
  missing, that's a plan defect to flag, not something to freehand.

- [ ] **Step 1: Write the complete `chat.json`**

Replace the full file content (the existing `imageGeneration` block is
preserved verbatim; everything else is new):

```json
{
  "imageGeneration": {
    "status": {
      "queued": "Waiting to generate",
      "generating": "Generating image",
      "refining": "Refining details",
      "complete": "Image ready",
      "error": "Generation failed"
    },
    "retry": "Try again",
    "generatedImageAlt": "Generated image"
  },
  "composer": {
    "placeholder": "Ask anything",
    "pleaseWaitTitle": "Please wait",
    "pleaseWaitDescription": "The model is still generating a response.",
    "stop": "Stop",
    "send": "Send"
  },
  "composerTools": {
    "attachFiles": "Attach files",
    "mcpTools": "MCP tools",
    "mcpDialog": {
      "title": "Available MCP Tools",
      "description": "Tools provided by active MCP servers. Manage servers in <strong>Settings > MCP Servers</strong>.",
      "noDescription": "No description for {{name}}."
    }
  },
  "advancedTools": {
    "deepResearch": "Deep research"
  },
  "messageList": {
    "greetingTitle": "Hello there!",
    "greetingSubtitle": "How can I assist you today?",
    "attachmentAlt": "attachment",
    "scrollToBottom": "Scroll to bottom"
  },
  "toolPreview": {
    "mapItineraryDayCount_one": "{{count}} day",
    "mapItineraryDayCount_other": "{{count}} days",
    "mapItineraryStopCount_one": "{{count}} stop",
    "mapItineraryStopCount_other": "{{count}} stops",
    "mapItinerarySummary": "{{days}}, {{stops}}",
    "toolFailed": "{{tool}} failed",
    "webSearchResultCount_one": "{{count}} result",
    "webSearchResultCount_other": "{{count}} results"
  },
  "toolFailedToast": {
    "title": "Tool failed: {{tool}}"
  },
  "messageAction": {
    "copy": "Copy",
    "regenerate": "Regenerate",
    "sources": "Sources"
  },
  "thinkingTimeline": {
    "thinking": "Thinking…",
    "working": "Working…",
    "thought": "Thought",
    "worked": "Worked",
    "done": "Done",
    "thoughtFor": "{{verb}} for {{duration}}",
    "durationSeconds_one": "{{count}} second",
    "durationSeconds_other": "{{count}} seconds",
    "durationMinutes": "{{minutes}}m",
    "durationMinutesSeconds": "{{minutes}}m {{seconds}}s",
    "searchResultCount_one": "{{count}} search result",
    "searchResultCount_other": "{{count}} search results"
  },
  "toc": {
    "fallbackLabel": "Message"
  },
  "toast": {
    "chatUpdated": "Chat updated",
    "chatDeleted": "Chat deleted"
  },
  "lcm": {
    "compacting": "Compacting conversation history…",
    "compactedSummary_one": "Compacted {{count}} message · saved ~{{tokens}} tokens",
    "compactedSummary_other": "Compacted {{count}} messages · saved ~{{tokens}} tokens",
    "compactionFailed": "Compaction failed (will retry next turn)"
  },
  "upload": {
    "failedTitle": "Upload failed",
    "failedDescription": "Failed to upload files."
  }
}
```

- [ ] **Step 2: Run `pnpm i18n:check` to confirm catalog parity**

Run: `pnpm i18n:check`
Expected: PASS (English is the only populated locale; the check verifies
structural parity across locale files, and every non-English catalog is
still an empty/placeholder shell from Phase 1 setup — this command must
already tolerate that, since it passed before this task).

- [ ] **Step 3: Update CLAUDE.md's "Adding a User-Facing String" section**

Replace `CLAUDE.md` lines 494-511 (the whole numbered list under the
`### Adding a User-Facing String` heading) with:

```markdown
### Adding a User-Facing String

1. Add the key to the right namespace in `src/shared/i18n/locales/en/<ns>.json`
   (dot-nested, component-scoped: `chat.composer.placeholder`).
2. Renderer, inside a component or hook:
   `const { t } = useTranslation('<ns>')` → `t('composer.placeholder')`;
   rich text (embedded link/bold) → `<Trans ns="<ns>" i18nKey="…">`. If the
   file already has `useTranslation('<otherNs>')`, switch to the array form
   `useTranslation(['<otherNs>', '<ns>'])` — keep the existing namespace
   first so already-written bare `t('key')` calls keep resolving unchanged —
   and prefix every new lookup with `<ns>:`.
3. Renderer, outside a component/hook (a plain exported function, a
   module-level helper, a `src/renderer/services/*.ts` function) —
   `useTranslation()` isn't callable there. Import the shared instance
   directly: `import { i18n } from '@/lib/i18n'` → `i18n.t('<ns>:key')`
   (always the explicit `ns:key` form — the raw instance has no namespace
   bound beyond the global `defaultNS: 'common'`).
4. Main process: `mainI18n.t('<ns>:key')` (or the `mainT()` helper in
   `src/main/lib/i18n.ts`, which additionally tolerates `mainI18n` being
   unassigned during a failed boot).
5. Dates/numbers: `useFormat()` (renderer). Never build a sentence by
   splicing a hand-formatted date/number into raw English word order — pass
   it as an interpolation param to a translated key instead.
6. Non-English catalogs are filled by the machine-translation pass — do not
   hand-edit them.
7. `src/renderer/components/ui/**` (shadcn primitives) is permanently out of
   scope for extraction — the generator (`pnpm shadcn:generate`) overwrites
   these files and drops any `t()` calls added by hand.
8. Before extracting a string into an existing function scope, check whether
   that scope already binds a local `t` (a loop variable, a destructured
   field, anything) — a shadowed `t` compiles fine today but breaks the next
   namespace pass that adds a real `t()` call in the same scope.
```

- [ ] **Step 4: Write `tests/unit/i18n/chat-namespace.test.ts`**

```typescript
import { readFileSync } from 'fs'
import { join } from 'path'

import { describe, expect, it } from 'vitest'

const chat = JSON.parse(
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
      'chat.json'
    ),
    'utf8'
  )
)

describe('chat namespace (en)', () => {
  it('keeps the pre-existing imageGeneration keys untouched', () => {
    expect(chat.imageGeneration.status.queued).toBe('Waiting to generate')
    expect(chat.imageGeneration.retry).toBe('Try again')
  })

  it('has the composer keys', () => {
    expect(chat.composer.placeholder).toBe('Ask anything')
    expect(chat.composer.pleaseWaitTitle).toBe('Please wait')
    expect(chat.composer.pleaseWaitDescription).toBe(
      'The model is still generating a response.'
    )
    expect(chat.composer.stop).toBe('Stop')
    expect(chat.composer.send).toBe('Send')
  })

  it('has the composerTools + MCP dialog keys, with a Trans-compatible description', () => {
    expect(chat.composerTools.attachFiles).toBe('Attach files')
    expect(chat.composerTools.mcpTools).toBe('MCP tools')
    expect(chat.composerTools.mcpDialog.title).toBe('Available MCP Tools')
    expect(chat.composerTools.mcpDialog.description).toBe(
      'Tools provided by active MCP servers. Manage servers in <strong>Settings > MCP Servers</strong>.'
    )
    expect(chat.composerTools.mcpDialog.noDescription).toBe(
      'No description for {{name}}.'
    )
  })

  it('has the advancedTools label', () => {
    expect(chat.advancedTools.deepResearch).toBe('Deep research')
  })

  it('has the messageList keys', () => {
    expect(chat.messageList.greetingTitle).toBe('Hello there!')
    expect(chat.messageList.greetingSubtitle).toBe(
      'How can I assist you today?'
    )
    expect(chat.messageList.attachmentAlt).toBe('attachment')
    expect(chat.messageList.scrollToBottom).toBe('Scroll to bottom')
  })

  it('has the toolPreview keys, including CLDR plural pairs', () => {
    expect(chat.toolPreview.mapItineraryDayCount_one).toBe('{{count}} day')
    expect(chat.toolPreview.mapItineraryDayCount_other).toBe('{{count}} days')
    expect(chat.toolPreview.mapItineraryStopCount_one).toBe('{{count}} stop')
    expect(chat.toolPreview.mapItineraryStopCount_other).toBe('{{count}} stops')
    expect(chat.toolPreview.mapItinerarySummary).toBe('{{days}}, {{stops}}')
    expect(chat.toolPreview.toolFailed).toBe('{{tool}} failed')
    expect(chat.toolPreview.webSearchResultCount_one).toBe('{{count}} result')
    expect(chat.toolPreview.webSearchResultCount_other).toBe(
      '{{count}} results'
    )
  })

  it('has the toolFailedToast title', () => {
    expect(chat.toolFailedToast.title).toBe('Tool failed: {{tool}}')
  })

  it('has the messageAction keys', () => {
    expect(chat.messageAction.copy).toBe('Copy')
    expect(chat.messageAction.regenerate).toBe('Regenerate')
    expect(chat.messageAction.sources).toBe('Sources')
  })

  it('has the thinkingTimeline keys, including CLDR plural pairs', () => {
    expect(chat.thinkingTimeline.thinking).toBe('Thinking…')
    expect(chat.thinkingTimeline.working).toBe('Working…')
    expect(chat.thinkingTimeline.thought).toBe('Thought')
    expect(chat.thinkingTimeline.worked).toBe('Worked')
    expect(chat.thinkingTimeline.done).toBe('Done')
    expect(chat.thinkingTimeline.thoughtFor).toBe('{{verb}} for {{duration}}')
    expect(chat.thinkingTimeline.durationSeconds_one).toBe('{{count}} second')
    expect(chat.thinkingTimeline.durationSeconds_other).toBe(
      '{{count}} seconds'
    )
    expect(chat.thinkingTimeline.durationMinutes).toBe('{{minutes}}m')
    expect(chat.thinkingTimeline.durationMinutesSeconds).toBe(
      '{{minutes}}m {{seconds}}s'
    )
    expect(chat.thinkingTimeline.searchResultCount_one).toBe(
      '{{count}} search result'
    )
    expect(chat.thinkingTimeline.searchResultCount_other).toBe(
      '{{count}} search results'
    )
  })

  it('has the toc fallback label', () => {
    expect(chat.toc.fallbackLabel).toBe('Message')
  })

  it('has the toast keys', () => {
    expect(chat.toast.chatUpdated).toBe('Chat updated')
    expect(chat.toast.chatDeleted).toBe('Chat deleted')
  })

  it('has the lcm keys, including a CLDR plural pair', () => {
    expect(chat.lcm.compacting).toBe('Compacting conversation history…')
    expect(chat.lcm.compactedSummary_one).toBe(
      'Compacted {{count}} message · saved ~{{tokens}} tokens'
    )
    expect(chat.lcm.compactedSummary_other).toBe(
      'Compacted {{count}} messages · saved ~{{tokens}} tokens'
    )
    expect(chat.lcm.compactionFailed).toBe(
      'Compaction failed (will retry next turn)'
    )
  })

  it('has the upload keys', () => {
    expect(chat.upload.failedTitle).toBe('Upload failed')
    expect(chat.upload.failedDescription).toBe('Failed to upload files.')
  })
})

describe('chat namespace CLDR plurals resolve via the real i18next instance', () => {
  it('picks the singular/plural form correctly for count=1 vs count>1', async () => {
    const { i18n, i18nReady } = await import('@/lib/i18n')
    await i18nReady
    expect(i18n.t('chat:toolPreview.mapItineraryDayCount', { count: 1 })).toBe(
      '1 day'
    )
    expect(i18n.t('chat:toolPreview.mapItineraryDayCount', { count: 3 })).toBe(
      '3 days'
    )
    expect(
      i18n.t('chat:thinkingTimeline.searchResultCount', { count: 1 })
    ).toBe('1 search result')
    expect(
      i18n.t('chat:thinkingTimeline.searchResultCount', { count: 5 })
    ).toBe('5 search results')
    expect(
      i18n.t('chat:lcm.compactedSummary', { count: 1, tokens: '2.3k' })
    ).toBe('Compacted 1 message · saved ~2.3k tokens')
    expect(
      i18n.t('chat:lcm.compactedSummary', { count: 4, tokens: '2.3k' })
    ).toBe('Compacted 4 messages · saved ~2.3k tokens')
  })
})
```

- [ ] **Step 5: Run the new test**

Run: `npx vitest run tests/unit/i18n/chat-namespace.test.ts`
Expected: PASS (all assertions green)

- [ ] **Step 6: Commit**

```bash
git add src/shared/i18n/locales/en/chat.json CLAUDE.md tests/unit/i18n/chat-namespace.test.ts
git commit -m "feat(i18n): populate chat namespace catalog + document renderer non-hook pattern"
```

---

### Task 2: Composer input box + upload hook

**Files:**

- Modify: `src/renderer/components/multimodel-input.tsx`
- Modify: `src/renderer/hooks/use-upload.ts`

**Interfaces:**

- Consumes: `chat:composer.*` and `chat:upload.*` keys from Task 1.

- [ ] **Step 1: Rewrite `src/renderer/hooks/use-upload.ts` in full**

```typescript
import { useSetAtom } from 'jotai'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sileo } from 'sileo'

import { convertFileToBase64 } from '@/lib/utils'
import { attachmentAtom } from '@/stores/chat'

export function useUpload() {
  const { t } = useTranslation('chat')
  const [loading, setLoading] = useState(false)
  const setAttachments = useSetAtom(attachmentAtom)

  const uploadFileToBase64 = async (files: File[]) => {
    const results = await Promise.all(
      files.map(async (file) => {
        const base64 = await convertFileToBase64(file)
        return { name: file.name, url: base64, contentType: file.type }
      })
    )
    setAttachments((prev) => [...(prev ?? []), ...results])
  }

  const uploadFile = async (files: File[], cleanup?: () => void) => {
    try {
      setLoading(true)
      await uploadFileToBase64(files)
    } catch {
      sileo.error({
        title: t('upload.failedTitle'),
        description: t('upload.failedDescription')
      })
    } finally {
      setLoading(false)
      if (typeof cleanup === 'function') {
        cleanup()
      }
    }
  }

  return { loading, uploadFile }
}
```

- [ ] **Step 2: Edit `src/renderer/components/multimodel-input.tsx`'s imports**

Replace:

```typescript
import {
  ChangeEvent,
  ClipboardEvent,
  memo,
  useCallback,
  useEffect,
  useRef
} from 'react'
import { useParams } from 'react-router'
import { sileo } from 'sileo'
```

(the real file has this as a multi-line import — replace exactly this block,
keeping the multi-line form):

```typescript
import {
  ChangeEvent,
  ClipboardEvent,
  memo,
  useCallback,
  useEffect,
  useRef
} from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { sileo } from 'sileo'
```

- [ ] **Step 3: Add the hook call at the top of `InputBox`**

Replace:

```typescript
}: {
  chatId: string
  messages: ChatMessage[]
  setMessages: UseChatHelpers['setMessages']
  sendMessage: UseChatHelpers['sendMessage']
  lastUsage?: Usage | null
}) {
  const [input, setInput] = useAtom(chatInputAtom)
```

With:

```typescript
}: {
  chatId: string
  messages: ChatMessage[]
  setMessages: UseChatHelpers['setMessages']
  sendMessage: UseChatHelpers['sendMessage']
  lastUsage?: Usage | null
}) {
  const { t } = useTranslation('chat')
  const [input, setInput] = useAtom(chatInputAtom)
```

- [ ] **Step 4: Wire the 4 hardcoded sites**

Replace:

```typescript
placeholder = 'Ask anything'
```

With:

```typescript
            placeholder={t('composer.placeholder')}
```

Replace:

```typescript
                if (status === 'streaming') {
                  sileo.warning({
                    title: 'Please wait',
                    description: 'The model is still generating a response.'
                  })
                } else {
```

With:

```typescript
                if (status === 'streaming') {
                  sileo.warning({
                    title: t('composer.pleaseWaitTitle'),
                    description: t('composer.pleaseWaitDescription')
                  })
                } else {
```

Replace:

```typescript
              aria-label="Stop"
```

With:

```typescript
              aria-label={t('composer.stop')}
```

Replace:

```typescript
              aria-label="Send"
```

With:

```typescript
              aria-label={t('composer.send')}
```

- [ ] **Step 5: Verify**

Run: `pnpm typecheck:web && pnpm lint`
Expected: PASS, zero new errors

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/multimodel-input.tsx src/renderer/hooks/use-upload.ts
git commit -m "feat(i18n): wire chat namespace into the composer input box and upload hook"
```

---

### Task 3: Composer tools (`+` menu, MCP dialog, active-tool pills)

**Files:**

- Modify: `src/renderer/components/composer-tools.tsx`

**Interfaces:**

- Consumes: `chat:advancedTools.deepResearch`, `chat:composerTools.*` keys
  from Task 1; `common.composer.*` / `common.action.add` keys (unchanged,
  already wired).
- Produces: `TOGGLES`'s items now carry `labelKey` (a `chat:`-prefixed
  literal) instead of `label` (raw English) — nothing outside this file
  reads `TOGGLES`, so this is a private rename, not a public interface
  change.

This task introduces the **two-namespace hook pattern** documented in
Task 1's CLAUDE.md update: both exported components already call
`useTranslation('common')` and gain `chat` keys, so both switch to the array
form `useTranslation(['common', 'chat'])` — `common` stays first (default for
every existing bare `t('action.add')` / `t('composer.reasoning')` /
`t(EFFORT_LEVELS[...].labelKey)` call, all unchanged), and every new chat
lookup is prefixed `chat:`.

- [ ] **Step 1: Rewrite `src/renderer/components/composer-tools.tsx` in full**

```typescript
import { TEST_IDS } from '@shared/constants/test-ids'
import type { EffortLevel } from '@shared/schemas/settings-schema'
import { AdvancedTools as AdvancedToolsType } from '@shared/types/ai'
import { produce } from 'immer'
import { useAtom } from 'jotai'
import {
  BrainIcon,
  HammerIcon,
  PaperclipIcon,
  PlusIcon,
  TelescopeIcon,
  XIcon
} from 'lucide-react'
import { ChangeEvent, useMemo, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import useSWR from 'swr'

import Markdown from '@/components/markdown'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useSettings } from '@/hooks/use-settings'
import { useUpload } from '@/hooks/use-upload'
import { cn } from '@/lib/utils'
import { advancedToolsAtom, reasoningEffortAtom } from '@/stores/chat'

interface McpToolInfo {
  name: string
  description: string
}
interface McpToolsGroup {
  mcpServerName: string
  tools: McpToolInfo[]
}

const TOGGLES = [
  {
    key: AdvancedToolsType.DeepResearch,
    labelKey: 'chat:advancedTools.deepResearch',
    icon: TelescopeIcon
  }
] as const

type ReasoningLevelKey = `composer.reasoningLevel.${EffortLevel}`

const EFFORT_LEVELS: { value: EffortLevel; labelKey: ReasoningLevelKey }[] = [
  { value: 'off', labelKey: 'composer.reasoningLevel.off' },
  { value: 'low', labelKey: 'composer.reasoningLevel.low' },
  { value: 'medium', labelKey: 'composer.reasoningLevel.medium' },
  { value: 'high', labelKey: 'composer.reasoningLevel.high' },
  { value: 'xhigh', labelKey: 'composer.reasoningLevel.xhigh' },
  { value: 'max', labelKey: 'composer.reasoningLevel.max' }
]

function useAdvancedToolToggle() {
  const [advancedTools, setAdvancedTools] = useAtom(advancedToolsAtom)
  const [reasoningEffort, setReasoningEffort] = useAtom(reasoningEffortAtom)

  const toggle = (name: AdvancedToolsType) =>
    setAdvancedTools(
      produce((draft) => {
        const idx = draft.indexOf(name)
        if (idx > -1) {
          draft.splice(idx, 1)
          return
        }
        draft.push(name)
        // Deep Research and reasoning effort are mutually exclusive.
        if (name === AdvancedToolsType.DeepResearch) setReasoningEffort('off')
      })
    )

  const setEffort = (level: EffortLevel) => {
    setReasoningEffort(level)
    // Picking a non-off effort turns off Deep Research, same mutual exclusion
    // as before, just from the other direction.
    if (level !== 'off') {
      setAdvancedTools(
        produce((draft) => {
          const idx = draft.indexOf(AdvancedToolsType.DeepResearch)
          if (idx > -1) draft.splice(idx, 1)
        })
      )
    }
  }

  return { advancedTools, toggle, reasoningEffort, setEffort }
}

/** Levels the currently-selected model actually supports, off first. */
function useAvailableEffortLevels(): typeof EFFORT_LEVELS {
  const { data: settings } = useSettings()
  const supported = settings?.providerConfig?.modelSnapshot?.reasoningLevels
  return useMemo(
    () =>
      supported && supported.length > 0
        ? EFFORT_LEVELS.filter((l) => supported.includes(l.value))
        : [],
    [supported]
  )
}

/** The composer's `+` button: attachments, reasoning effort/deep-research, MCP tools. */
export function ComposerToolsButton() {
  const { t } = useTranslation(['common', 'chat'])
  const { uploadFile } = useUpload()
  const fileRef = useRef<HTMLInputElement>(null)
  const { advancedTools, toggle, reasoningEffort, setEffort } =
    useAdvancedToolToggle()
  const availableEffortLevels = useAvailableEffortLevels()
  const [mcpOpen, setMcpOpen] = useState(false)

  const { data } = useSWR<{ tools: McpToolsGroup[] }>('/api/mcp/tools')
  const mcpCount = useMemo(
    () => data?.tools?.reduce((acc, g) => acc + g.tools.length, 0) ?? 0,
    [data?.tools]
  )

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return
    uploadFile([...files], () => {
      if (fileRef.current) fileRef.current.value = ''
    })
  }

  const hasActiveTool = advancedTools.length > 0 || reasoningEffort !== 'off'

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        aria-hidden="true"
        tabIndex={-1}
        className="hidden"
        onChange={handleFiles}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t('action.add')}
          className={cn(
            'text-muted-foreground hover:bg-muted hover:text-foreground data-popup-open:bg-muted flex size-8 shrink-0 items-center justify-center rounded-full transition-colors [&_svg]:size-[18px]',
            hasActiveTool && 'text-[#0285ff] dark:text-[#48aaff]'
          )}
        >
          <PlusIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          className="w-52 rounded-xl"
        >
          <DropdownMenuItem
            onClick={() => setTimeout(() => fileRef.current?.click(), 0)}
          >
            <PaperclipIcon />
            {t('chat:composerTools.attachFiles')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {availableEffortLevels.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger
                data-testid={TEST_IDS.composer.reasoningEffortItem}
              >
                <BrainIcon />
                {t('composer.reasoning')}
                {reasoningEffort !== 'off' && (
                  <span className="text-muted-foreground ml-auto text-xs">
                    {t(
                      EFFORT_LEVELS.find((l) => l.value === reasoningEffort)
                        ?.labelKey ?? 'composer.reasoningLevel.off'
                    )}
                  </span>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={reasoningEffort}
                  onValueChange={(v) => setEffort(v as EffortLevel)}
                >
                  {availableEffortLevels.map((level) => (
                    <DropdownMenuRadioItem
                      key={level.value}
                      value={level.value}
                      data-testid={`${TEST_IDS.composer.reasoningEffortLevel}-${level.value}`}
                    >
                      {t(level.labelKey)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          {TOGGLES.map(({ key, labelKey, icon: Icon }) => (
            <DropdownMenuCheckboxItem
              key={key}
              checked={advancedTools.includes(key)}
              onCheckedChange={() => toggle(key)}
            >
              <Icon />
              {t(labelKey)}
            </DropdownMenuCheckboxItem>
          ))}
          {mcpCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setMcpOpen(true)}>
                <HammerIcon />
                {t('chat:composerTools.mcpTools')}
                <span className="text-muted-foreground ml-auto text-xs">
                  {mcpCount}
                </span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={mcpOpen} onOpenChange={setMcpOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('chat:composerTools.mcpDialog.title')}</DialogTitle>
            <DialogDescription>
              <Trans ns="chat" i18nKey="composerTools.mcpDialog.description">
                Tools provided by active MCP servers. Manage servers in{' '}
                <strong>Settings &gt; MCP Servers</strong>.
              </Trans>
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-125 flex-col gap-4 overflow-y-auto">
            {data?.tools?.map(({ mcpServerName, tools }) => (
              <div key={mcpServerName} className="flex flex-col gap-3">
                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  {mcpServerName}
                </p>
                {tools.map((tool) => (
                  <div key={tool.name} className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium">{tool.name}</p>
                    <div className="[&_.markdown]:text-muted-foreground [&_.markdown]:text-xs [&_.markdown]:leading-snug [&_.markdown_li]:leading-normal [&_.markdown_ol]:mb-0.5 [&_.markdown_ul]:mb-0.5">
                      <Markdown
                        src={
                          tool.description ||
                          t('chat:composerTools.mcpDialog.noDescription', {
                            name: tool.name
                          })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Removable pills shown above the textarea for each active advanced tool. */
export function ActiveToolPills() {
  const { t } = useTranslation(['common', 'chat'])
  const { advancedTools, toggle, reasoningEffort, setEffort } =
    useAdvancedToolToggle()
  // Renamed from `t` to `tool` — this scope now also calls the real
  // translation function above, and a filter callback named `t` would
  // shadow it silently (see CLAUDE.md's i18n "Adding a User-Facing String"
  // step 8).
  const active = TOGGLES.filter((tool) => advancedTools.includes(tool.key))
  const effortLabelKey =
    reasoningEffort !== 'off'
      ? (EFFORT_LEVELS.find((l) => l.value === reasoningEffort)?.labelKey ??
        null)
      : null

  if (active.length === 0 && !effortLabelKey) return null

  return (
    <div className="flex flex-wrap gap-1 px-1">
      {effortLabelKey && (
        <button
          type="button"
          onClick={() => setEffort('off')}
          className="flex items-center gap-1 rounded-full bg-[#0285ff]/10 px-2 py-0.5 text-xs font-medium text-[#0285ff] transition-colors hover:bg-[#0285ff]/16 dark:text-[#48aaff] [&_svg]:size-3.5"
        >
          <BrainIcon />
          {t('composer.reasoningPill', { label: t(effortLabelKey) })}
          <XIcon className="opacity-60" />
        </button>
      )}
      {active.map(({ key, labelKey, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => toggle(key)}
          className="flex items-center gap-1 rounded-full bg-[#0285ff]/10 px-2 py-0.5 text-xs font-medium text-[#0285ff] transition-colors hover:bg-[#0285ff]/16 dark:text-[#48aaff] [&_svg]:size-3.5"
        >
          <Icon />
          {t(labelKey)}
          <XIcon className="opacity-60" />
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck:web && pnpm lint && pnpm format:check`
Expected: PASS. In particular confirm `t(labelKey)` and `t(effortLabelKey)`
type-check against the array-form `t`'s key union (both `chat:…` and bare
`common` keys) — if TypeScript rejects `labelKey`'s inferred literal type,
the fallback is an explicit type annotation on `TOGGLES`, not an `as never`
cast (this project's established `ParseKeys` precedent from `mainT()`
specifically avoids casts wherever the key is a compile-time literal).

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/composer-tools.tsx
git commit -m "feat(i18n): wire chat namespace into composer-tools (two-namespace hook pattern)"
```

---

### Task 4: Message list (`messages.tsx`)

**⚠️ This file is under active, ongoing concurrent editing by unrelated work
in this same working tree** (confirmed twice: the scroll-to-bottom button's
icon/variant/className and the `finalTextBlocks` render loop's gallery
placement have both changed since this plan was first drafted). A
full-file-content rewrite is unsafe here — it would silently revert
whatever the concurrent edit adds next. This task is therefore written as
a sequence of small, independently-anchored find/replace edits instead:
each edit's "Find" text is a short, unique substring confirmed to survive
every drift observed so far (import lines far from the churn, the literal
English strings themselves, a stable `aria-label` value). Apply each edit
with a tool like `Edit` (exact string match) — never regenerate the whole
file from a snapshot.

**Files:**

- Modify: `src/renderer/components/messages.tsx`

**Interfaces:**

- Consumes: `chat:messageList.*`, `chat:toolPreview.*` keys from Task 1.
- Produces: no signature changes to `getToolCallPreview`, `buildAssistantTurn`,
  or the exported `groupIntoSegments` — all three stay plain functions with
  their existing signatures, now reading translations via the imported `i18n`
  singleton rather than a threaded parameter. This means
  `tests/unit/renderer/components/citations-across-turns.test.ts` and
  `tests/unit/renderer/components/message-spinner.test.ts` (both call
  `groupIntoSegments(messages)` directly, single-argument) need **no
  changes** — verify this explicitly in Step 3 below rather than assuming it.

- [ ] **Step 1: Before touching anything, re-read the live file**

Read `src/renderer/components/messages.tsx` in full. Confirm each "Find"
string in Steps 2-10 below appears **exactly once**. If any of them appears
zero times, or more than once, or the surrounding code makes an edit
ambiguous, STOP and report NEEDS_CONTEXT with exactly what you found — do
not guess which occurrence to use or improvise a substitute anchor.

- [ ] **Step 2: Add the two new imports**

Find (this exact line, wherever it currently sits among the `react`-family
imports — its neighbors above it may currently read `ChevronDownIcon` or
`ArrowDownIcon, ChevronDownIcon` or similar; ignore that entirely, this
edit does not touch that line):

```typescript
import Zoom from 'react-medium-image-zoom'
```

Replace with:

```typescript
import { useTranslation } from 'react-i18next'
import Zoom from 'react-medium-image-zoom'
```

Find:

```typescript
import { userMessageText } from '@/lib/user-message-text'
```

Replace with:

```typescript
import { i18n } from '@/lib/i18n'
import { userMessageText } from '@/lib/user-message-text'
```

- [ ] **Step 3: `UserSegment` — add the hook, translate the `alt` text**

Find:

```typescript
const UserSegment = memo(function UserSegment({
  message
}: {
  message: ChatMessage
}) {
  return (
```

Replace with:

```typescript
const UserSegment = memo(function UserSegment({
  message
}: {
  message: ChatMessage
}) {
  const { t } = useTranslation('chat')
  return (
```

Find:

```typescript
alt = 'attachment'
```

Replace with:

```typescript
                        alt={t('messageList.attachmentAlt')}
```

- [ ] **Step 4: `getToolCallPreview`'s `mapItinerary` case — CLDR-plural day/stop summary**

Find:

```typescript
const dayCount = days.length
const summary = `${dayCount} day${dayCount === 1 ? '' : 's'}, ${stops} stop${stops === 1 ? '' : 's'}`
return withInline(label, summary)
```

Replace with:

```typescript
// Days and stops pluralize independently, so each gets its own
// CLDR-keyed lookup; the outer "{{days}}, {{stops}}" template composes
// the two already-translated fragments (same technique
// common.composer.reasoningPill already uses for its {{label}} param).
// This is a plain helper (not a component or hook), so translated text
// uses the shared `i18n` singleton directly rather than useTranslation().
const dayCount = days.length
const daysText = i18n.t('chat:toolPreview.mapItineraryDayCount', {
  count: dayCount
})
const stopsText = i18n.t('chat:toolPreview.mapItineraryStopCount', {
  count: stops
})
const summary = i18n.t('chat:toolPreview.mapItinerarySummary', {
  days: daysText,
  stops: stopsText
})
return withInline(label, summary)
```

- [ ] **Step 5: `buildAssistantTurn`'s error-toolResult fallback text**

Find:

```typescript
const errorText =
  toolResult.content.find((c) => c.type === 'text')?.text ??
  `${capitalCase(toolResult.toolName)} failed`
```

Replace with:

```typescript
const errorText =
  toolResult.content.find((c) => c.type === 'text')?.text ??
  i18n.t('chat:toolPreview.toolFailed', {
    tool: capitalCase(toolResult.toolName)
  })
```

- [ ] **Step 6: `buildAssistantTurn`'s webSearch-results-count text (CLDR plural)**

Find:

```typescript
steps.push({
  type: 'toolResult',
  text: `${results.length} results`,
  toolName: 'webSearch',
  webSearchResults: results
})
```

Replace with:

```typescript
steps.push({
  type: 'toolResult',
  text: i18n.t('chat:toolPreview.webSearchResultCount', {
    count: results.length
  }),
  toolName: 'webSearch',
  webSearchResults: results
})
```

- [ ] **Step 7: `Messages` component — add the hook**

Find:

```typescript
function Messages({
  chatId,
  status,
  messages,
  regenerate,
  showDiscover
}: MessagesProps) {
  const isLoading = status === 'streaming' || status === 'submitted'
```

Replace with:

```typescript
function Messages({
  chatId,
  status,
  messages,
  regenerate,
  showDiscover
}: MessagesProps) {
  const { t } = useTranslation('chat')
  const isLoading = status === 'streaming' || status === 'submitted'
```

- [ ] **Step 8: Empty-chat greeting**

Find:

```typescript
                <p className="text-3xl font-bold tracking-tight">
                  Hello there!
                </p>
                <p className="text-muted-foreground mt-2 text-lg">
                  How can I assist you today?
                </p>
```

Replace with:

```typescript
                <p className="text-3xl font-bold tracking-tight">
                  {t('messageList.greetingTitle')}
                </p>
                <p className="text-muted-foreground mt-2 text-lg">
                  {t('messageList.greetingSubtitle')}
                </p>
```

- [ ] **Step 9: Scroll-to-bottom button's `aria-label`**

Find (this exact attribute — do not touch the button's `variant`, `size`,
`className`, or icon on the surrounding lines, whatever they currently are):

```typescript
          aria-label="Scroll to bottom"
```

Replace with:

```typescript
          aria-label={t('messageList.scrollToBottom')}
```

- [ ] **Step 10: Verify the pre-existing tests still pass unmodified**

Run:

```bash
npx vitest run tests/unit/renderer/components/citations-across-turns.test.ts
npx vitest run tests/unit/renderer/components/message-spinner.test.ts
```

Expected: both PASS, with **zero edits** to either test file. If either
fails, read the failure before touching anything — `groupIntoSegments`'s
signature must stay `(messages: ChatMessage[]) => Segment[]`, unchanged from
before this task.

- [ ] **Step 11: Verify**

Run: `pnpm typecheck:web && pnpm lint`
Expected: PASS. If `pnpm lint`/`pnpm typecheck` flag an unused
`ChevronDownIcon` import in this same file, that's a separate, pre-existing
issue this task doesn't own — see the dispatch note about it before
deciding whether to touch it.

- [ ] **Step 12: Commit**

```bash
git add src/renderer/components/messages.tsx
git commit -m "feat(i18n): wire chat namespace into the message list"
```

---

### Task 5: Thinking timeline (`thinking-timeline.tsx`)

**Files:**

- Modify: `src/renderer/components/thinking-timeline.tsx`

**Interfaces:**

- Consumes: `chat:thinkingTimeline.*` keys from Task 1.
- Produces: `formatDuration(ms: number): string | null` and
  `getStepTitle(step: TimelineStep): string` keep their existing signatures
  (both are plain module-level helpers, not components/hooks — same
  raw-`i18n`-import pattern as Task 4).

- [ ] **Step 1: Rewrite `src/renderer/components/thinking-timeline.tsx` in full**

```typescript
import { faviconUrl } from '@shared/constants/external-urls'
import type { TimelineStep } from '@shared/types/chat'
import type { WebSearchResult } from '@shared/types/web-search'
import {
  BrainIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleCheckBigIcon,
  ClockFadingIcon,
  GlobeIcon,
  LoaderIcon,
  XCircleIcon
} from 'lucide-react'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { i18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

import { Markdown } from './markdown'
import { ShimmeringText } from './shimmering-text'
import { Badge } from './ui/badge'

export type { TimelineStep }

interface ThinkingTimelineProps {
  steps: TimelineStep[]
  durationMs: number
  isStreaming: boolean
}

type StepStatus = 'complete' | 'active' | 'pending'

// Matches AI SDK Elements' chain-of-thought status grading: the step in flight
// reads at full strength, settled steps recede.
const STATUS_TEXT: Record<StepStatus, string> = {
  complete: 'text-muted-foreground',
  active: 'text-foreground',
  pending: 'text-muted-foreground/50'
}

function StepIcon({
  step,
  status
}: {
  step: TimelineStep
  status: StepStatus
}) {
  if (step.type === 'toolResult' && step.isError) {
    return <XCircleIcon size={15} className="text-destructive shrink-0" />
  }
  const cls = cn('shrink-0', STATUS_TEXT[status])
  if (step.toolName === 'webSearch')
    return <GlobeIcon size={15} className={cls} />
  if (step.type === 'thinking') return <BrainIcon size={15} className={cls} />
  return <ClockFadingIcon size={15} className={cls} />
}

const SearchResultPill = memo(function SearchResultPill({
  item
}: {
  item: WebSearchResult
}) {
  let favicon = ''
  try {
    favicon = faviconUrl(new URL(item.link).origin)
  } catch {
    // no favicon — the label still renders
  }

  return (
    <Badge
      variant="outline"
      className="max-w-[14rem] gap-1 font-normal"
      render={
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          title={item.title}
        />
      }
    >
      {favicon && (
        <img src={favicon} alt="" className="size-3 shrink-0 rounded-full" />
      )}
      <span className="truncate">{item.title}</span>
    </Badge>
  )
})

function TimelineNode({
  icon,
  isLast,
  children
}: {
  icon: React.ReactNode
  isLast?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="animate-in fade-in-0 slide-in-from-top-1 flex gap-2.5 pb-3 duration-300 last:pb-0">
      <div className="mt-1 flex flex-col items-center">
        <div className="flex shrink-0 items-center justify-center">{icon}</div>
        {!isLast && <div className="border-border w-px flex-1 border-l" />}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/**
 * A plain helper (not a component or hook) — translated text goes through
 * the shared `i18n` singleton directly, matching `getToolCallPreview` in
 * `messages.tsx`.
 */
function formatDuration(ms: number): string | null {
  // Message timestamps mark stream START, not END (see pi-ai providers), so
  // sub-second durations are unreliable — drop them rather than show "0 seconds".
  if (!Number.isFinite(ms) || ms < 1000) return null
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) {
    return i18n.t('chat:thinkingTimeline.durationSeconds', { count: seconds })
  }
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return remaining > 0
    ? i18n.t('chat:thinkingTimeline.durationMinutesSeconds', {
        minutes,
        seconds: remaining
      })
    : i18n.t('chat:thinkingTimeline.durationMinutes', { minutes })
}

/** Extract a short title from a step for the collapsed preview */
function getStepTitle(step: TimelineStep): string {
  if (step.type === 'toolCall') return step.text
  if (step.type === 'toolResult' && step.webSearchResults) {
    return i18n.t('chat:thinkingTimeline.searchResultCount', {
      count: step.webSearchResults.length
    })
  }
  if (step.type === 'toolResult' && step.isError) return step.text
  // thinking: extract **bold** or first line
  const boldMatch = step.text.match(/\*\*(.+?)\*\*/)
  if (boldMatch) return boldMatch[1]
  return (
    step.text.split('\n').filter(Boolean)[0]?.slice(0, 60) ??
    i18n.t('chat:thinkingTimeline.thinking')
  )
}

export function ThinkingTimeline({
  steps,
  durationMs,
  isStreaming
}: ThinkingTimelineProps) {
  const { t } = useTranslation('chat')
  const [isExpanded, setIsExpanded] = useState(false)
  const toggleExpanded = useCallback(() => setIsExpanded((prev) => !prev), [])

  const hasThinking = useMemo(
    () => steps.some((s) => s.type === 'thinking'),
    [steps]
  )

  const latestTitle = useMemo(() => {
    if (steps.length === 0)
      return hasThinking ? t('thinkingTimeline.thinking') : t('thinkingTimeline.working')
    return getStepTitle(steps[steps.length - 1])
  }, [steps, hasThinking, t])

  if (steps.length === 0 && !isStreaming) return null

  const verb = hasThinking ? t('thinkingTimeline.thought') : t('thinkingTimeline.worked')
  const duration = formatDuration(durationMs)
  const headerText = isStreaming
    ? latestTitle
    : duration
      ? t('thinkingTimeline.thoughtFor', { verb, duration })
      : verb

  return (
    // min-w-0 lets the timeline shrink inside flex parents instead of pushing
    // them wider when a tool-call URL or path is long. max-w-full clamps it
    // to the ancestor (e.g. md:max-w-3xl) regardless of intrinsic content.
    <div className="mb-3 max-w-full min-w-0">
      <button
        type="button"
        aria-expanded={isExpanded}
        className="text-muted-foreground hover:text-foreground flex max-w-full items-center gap-1.5 overflow-hidden text-sm transition-colors"
        onClick={toggleExpanded}
      >
        {isStreaming ? (
          <LoaderIcon size={16} className="shrink-0 animate-spin" />
        ) : hasThinking ? (
          <BrainIcon size={16} className="shrink-0" />
        ) : (
          <CheckIcon size={16} className="shrink-0" />
        )}
        {isStreaming ? (
          <ShimmeringText
            key={headerText}
            className="truncate font-medium"
            text={headerText}
          />
        ) : (
          <span className="truncate font-medium">{headerText}</span>
        )}
        <ChevronDownIcon
          size={16}
          className={cn(
            'shrink-0 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* CSS grid-rows trick: animates height:auto with zero JS (replaces the
          old framer-motion AnimatePresence). Content stays mounted so the
          per-step slide-in animations only fire once, on first appearance. */}
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
          isExpanded
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-2">
            {/* react-doctor/no-array-index-as-key: suppressed — TimelineStep has no
              stable id field. Steps are append-only during streaming (they never
              reorder or get removed while visible), so index keys are safe here. */}
            {steps.map((step, i) => {
              const status: StepStatus = !isStreaming
                ? 'complete'
                : i === steps.length - 1
                  ? 'active'
                  : 'complete'
              return (
                <TimelineNode
                  key={i}
                  icon={<StepIcon step={step} status={status} />}
                >
                  <div
                    className={cn(
                      // min-w-0 break-words: tool-call previews like
                      // "webFetch: https://…/long-url.pdf" must wrap mid-URL
                      // instead of overflowing the timeline.
                      'min-w-0 text-sm leading-relaxed wrap-break-word [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-sm [&_h4]:text-sm [&_ol]:my-0.5 [&_ul]:my-0.5 [&_p:first-child]:mt-0 [&_p]:my-0.5',
                      STATUS_TEXT[status],
                      step.type === 'toolResult' &&
                        step.isError &&
                        'text-destructive'
                    )}
                  >
                    {step.type === 'thinking' ? (
                      <Markdown src={step.text} />
                    ) : (
                      <>
                        <p className="wrap-break-word">{step.text}</p>
                        {step.codeArgument && (
                          <pre className="bg-muted/50 border-border/60 mt-1 max-h-48 overflow-auto rounded-md border p-2 font-mono text-[11.5px] leading-relaxed wrap-break-word whitespace-pre-wrap">
                            <code>{step.codeArgument}</code>
                          </pre>
                        )}
                      </>
                    )}
                  </div>

                  {step.webSearchResults &&
                    step.webSearchResults.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {step.webSearchResults.map((result) => (
                          <SearchResultPill key={result.link} item={result} />
                        ))}
                      </div>
                    )}
                </TimelineNode>
              )
            })}

            {/* Done node — only when streaming is finished */}
            {!isStreaming && (
              <TimelineNode
                isLast
                icon={
                  <CircleCheckBigIcon
                    size={15}
                    className="text-muted-foreground shrink-0"
                  />
                }
              >
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t('thinkingTimeline.done')}
                </p>
              </TimelineNode>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck:web && pnpm lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/thinking-timeline.tsx
git commit -m "feat(i18n): wire chat namespace into the thinking timeline"
```

---

### Task 6: Small chat surfaces (message-calling-tools, message-action, chat-toc, chat services, LCM status card)

**Files:**

- Modify: `src/renderer/components/messages-calling-tools.tsx`
- Modify: `src/renderer/components/massage-action.tsx`
- Modify: `src/renderer/components/chat-toc.tsx`
- Modify: `src/renderer/services/chat.ts`
- Modify: `src/renderer/components/chat/lcm-status-card.tsx`

**Interfaces:**

- Consumes: `chat:toolPreview.toolFailed` (same key `messages.tsx`/Task 4
  already uses — do not add a second, duplicate key for this), `chat:toolFailedToast.title`,
  `chat:messageAction.*`, `chat:toc.fallbackLabel`, `chat:toast.*`, `chat:lcm.*`
  keys from Task 1.

These five files are batched together — each needs the same small shape of
change (add a `useTranslation('chat')` call or a raw `i18n` import, swap a
handful of literals) with no interdependency between them.

**⚠️ `messages-calling-tools.tsx` has other uncommitted, unrelated changes
sitting in it right now** (an `ImageGenerationCard` dispatch branch, from
concurrent work already in the tree before this plan started — confirmed
present and stable across repeated checks, unlike `messages.tsx` above, but
still: do not assume the snapshot below is exhaustively "the whole file" by
the time you run this task). Apply the 4 targeted edits below rather than
overwriting the file.

- [ ] **Step 1a: Re-read the live file first**

Read `src/renderer/components/messages-calling-tools.tsx` in full. Confirm
each "Find" string in Steps 1b-1e appears exactly once. If not, STOP and
report NEEDS_CONTEXT with what you found.

- [ ] **Step 1b: Add the import**

Find:

```typescript
import { memo, useEffect } from 'react'
import { sileo } from 'sileo'
```

Replace with:

```typescript
import { memo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { sileo } from 'sileo'
```

- [ ] **Step 1c: Add the hook at the top of `CallingTools`**

Find:

```typescript
function CallingTools({
  chatId,
  toolResult
}: {
  chatId: string
  toolResult: ChatToolResultMessage
}) {
  const toolName = toolResult.toolName ?? ''
```

Replace with:

```typescript
function CallingTools({
  chatId,
  toolResult
}: {
  chatId: string
  toolResult: ChatToolResultMessage
}) {
  const { t } = useTranslation('chat')
  const toolName = toolResult.toolName ?? ''
```

- [ ] **Step 1d: Translate the fallback error text**

Find:

```typescript
return text && text !== '{}' ? text : `${toolLabel} failed`
```

Replace with:

```typescript
return text && text !== '{}'
  ? text
  : t('toolPreview.toolFailed', { tool: toolLabel })
```

- [ ] **Step 1e: Translate the toast title**

Find:

```typescript
sileo.error({
  title: `Tool failed: ${toolLabel}`,
  description: errorMessage
})
```

Replace with:

```typescript
sileo.error({
  title: t('toolFailedToast.title', { tool: toolLabel }),
  description: errorMessage
})
```

- [ ] **Step 2: Rewrite `src/renderer/components/massage-action.tsx` in full**

```typescript
import { faviconUrl } from '@shared/constants/external-urls'
import type { WebSearchResult } from '@shared/types/web-search'
import { useSetAtom } from 'jotai'
import { CheckIcon, CopyIcon, RefreshCwIcon } from 'lucide-react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useClipboard } from '@/hooks/use-clipboard'
import { compactRelativeTime } from '@/lib/relative-time'
import { sourcesPanelAtom } from '@/stores/chat'

import AudioPlayer from './audio-player'
import { IconWrapper, MessageActionItem } from './message-action-primitives'
import { Button } from './ui/button'
import { TooltipProvider } from './ui/tooltip'

// Re-export so existing callers of massage-action keep working.
export { IconWrapper, MessageActionItem }

// ─── Sources Button ─────────────────────────────────────────────────────────

function SourcesButton({
  webSearchResults,
  onClick
}: {
  webSearchResults: WebSearchResult[]
  onClick: () => void
}) {
  const { t } = useTranslation('chat')
  const favicons = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const r of webSearchResults) {
      try {
        const origin = new URL(r.link).origin
        if (seen.has(origin)) continue
        seen.add(origin)
        result.push(faviconUrl(origin))
        if (result.length >= 3) break
      } catch {
        // skip
      }
    }
    return result
  }, [webSearchResults])

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground h-7 gap-1.5 rounded-lg px-2 text-xs"
    >
      <span className="*:ring-background flex gap-[-0.375rem] *:ring-2">
        {favicons.map((src, i) => (
          <img key={i} src={src} className="size-3.5 rounded-full" alt="" />
        ))}
      </span>
      {t('messageAction.sources')}
    </Button>
  )
}

// ─── MessageAction ──────────────────────────────────────────────────────────

export const MessageAction = memo(function MessageAction({
  content,
  regenerate,
  webSearchResults,
  timestamp
}: {
  content: string
  regenerate: () => void
  webSearchResults?: WebSearchResult[]
  /** When the reply was generated (epoch ms). Shown as a compact relative
   *  time, matching the sidebar. */
  timestamp?: number
}) {
  const { t } = useTranslation('chat')
  const { copied, handleCopy } = useClipboard()
  const setSourcesPanel = useSetAtom(sourcesPanelAtom)

  const onCopy = useCallback(() => handleCopy(content), [handleCopy, content])
  const onSourcesClick = useCallback(
    () =>
      setSourcesPanel({
        webSearchResults: webSearchResults!,
        messageText: content
      }),
    [setSourcesPanel, webSearchResults, content]
  )

  const relTime = timestamp ? compactRelativeTime(new Date(timestamp)) : null
  const hasSources = !!webSearchResults && webSearchResults.length > 0

  return (
    <TooltipProvider>
      <div className="text-muted-foreground mt-1.5 flex items-center gap-0.5">
        <MessageActionItem tooltipContent={t('messageAction.copy')}>
          <IconWrapper onClick={onCopy}>
            {copied !== content ? <CopyIcon /> : <CheckIcon />}
          </IconWrapper>
        </MessageActionItem>

        <AudioPlayer content={content} />

        <MessageActionItem tooltipContent={t('messageAction.regenerate')}>
          <IconWrapper onClick={regenerate}>
            <RefreshCwIcon />
          </IconWrapper>
        </MessageActionItem>

        {hasSources && (
          <SourcesButton
            webSearchResults={webSearchResults!}
            onClick={onSourcesClick}
          />
        )}

        {relTime && (
          <span className="text-muted-foreground/50 ml-1.5 shrink-0 text-xs tabular-nums">
            {relTime}
          </span>
        )}
      </div>
    </TooltipProvider>
  )
})
```

- [ ] **Step 3: Rewrite `src/renderer/components/chat-toc.tsx` in full**

```typescript
import { TEST_IDS } from '@shared/constants/test-ids'
import type { ChatMessage } from '@shared/types/chat'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { userMessageText } from '@/lib/user-message-text'
import { cn } from '@/lib/utils'

// Below this many user messages there is nothing worth navigating.
const MIN_ENTRIES = 2
// Where a jumped-to message lands, measured from the scroll container's top.
const SCROLL_OFFSET = 88

interface TocEntry {
  id: string
  text: string
}

/**
 * A ChatGPT-style navigation rail pinned to the right edge of the chat area.
 * Each user message is one entry: a thin bar when collapsed, a truncated line
 * when the rail is hovered. Clicking scrolls that message near the top; the
 * active entry tracks the scroll position.
 */
export function ChatToc({
  scrollContainerRef,
  messages
}: {
  scrollContainerRef: RefObject<HTMLDivElement | null>
  messages: ChatMessage[]
}) {
  const { t } = useTranslation('chat')
  const entries: TocEntry[] = messages
    .filter((m) => m.role === 'user')
    .map((m) => ({ id: m.id, text: userMessageText(m) || t('toc.fallbackLabel') }))

  const [activeId, setActiveId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const enoughEntries = entries.length >= MIN_ENTRIES

  // Scroll-spy: the last user message whose top has crossed the offset line
  // is the active one. Reads the DOM live on every scroll/resize so it always
  // sees the current set of message nodes.
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || !enoughEntries) return

    const compute = () => {
      const nodes =
        container.querySelectorAll<HTMLElement>('[data-user-msg-id]')
      if (nodes.length === 0) return
      const line = container.getBoundingClientRect().top + SCROLL_OFFSET
      let current = nodes[0].dataset.userMsgId ?? null
      for (const node of nodes) {
        if (node.getBoundingClientRect().top <= line) {
          current = node.dataset.userMsgId ?? current
        } else {
          break
        }
      }
      setActiveId(current)
    }

    compute()
    container.addEventListener('scroll', compute, { passive: true })
    const ro = new ResizeObserver(compute)
    ro.observe(container)
    return () => {
      container.removeEventListener('scroll', compute)
      ro.disconnect()
    }
  }, [scrollContainerRef, enoughEntries, entries.length])

  useEffect(() => {
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current)
    }
  }, [])

  if (!enoughEntries) return null

  const jumpTo = (id: string) => {
    const container = scrollContainerRef.current
    const node = container?.querySelector<HTMLElement>(
      `[data-user-msg-id="${CSS.escape(id)}"]`
    )
    if (!container || !node) return
    const delta =
      node.getBoundingClientRect().top -
      container.getBoundingClientRect().top -
      SCROLL_OFFSET
    container.scrollBy({ top: delta, behavior: 'smooth' })
    setActiveId(id)
  }

  const open = () => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current)
    setExpanded(true)
  }
  const scheduleClose = () => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current)
    collapseTimer.current = setTimeout(() => setExpanded(false), 120)
  }

  return (
    <div
      className="absolute top-1/2 right-3 z-10 -translate-y-1/2"
      onMouseEnter={open}
      onMouseLeave={scheduleClose}
      data-testid={TEST_IDS.chatToc.rail}
    >
      {expanded ? (
        <div className="bg-popover/95 supports-[backdrop-filter]:bg-popover/80 flex max-h-[70vh] w-64 flex-col gap-0.5 overflow-y-auto rounded-xl border p-1.5 shadow-lg backdrop-blur">
          {entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => jumpTo(entry.id)}
              data-testid={TEST_IDS.chatToc.entry}
              className={cn(
                'truncate rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                entry.id === activeId
                  ? 'bg-muted text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              {entry.text}
            </button>
          ))}
        </div>
      ) : (
        <div className="no-scrollbar flex max-h-[70vh] flex-col items-end gap-1.5 overflow-y-auto py-1">
          {entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-label={entry.text}
              onClick={() => jumpTo(entry.id)}
              className="group flex h-3 items-center"
            >
              <span
                className={cn(
                  'h-0.5 rounded-full transition-[width,background-color]',
                  entry.id === activeId
                    ? 'bg-foreground/70 w-6'
                    : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/60 w-4'
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

**⚠️ `services/chat.ts` has other uncommitted, unrelated changes sitting in
it right now** (the `window.location.hash` navigation fix, confirmed
present and stable across repeated checks, unlike `messages.tsx` above).
Apply the 3 targeted edits below rather than overwriting the file. This
file exports plain async functions (not hooks), so it uses the raw `i18n`
singleton, same as `messages.tsx`'s helpers.

- [ ] **Step 4a: Re-read the live file first**

Read `src/renderer/services/chat.ts` in full (it's short). Confirm each
"Find" string in Steps 4b-4d appears exactly once. If not, STOP and report
NEEDS_CONTEXT with what you found.

- [ ] **Step 4b: Add the import**

Find:

```typescript
import { sileo } from 'sileo'
import { mutate } from 'swr'
```

Replace with:

```typescript
import { sileo } from 'sileo'
import { mutate } from 'swr'

import { i18n } from '@/lib/i18n'
```

- [ ] **Step 4c: Translate `updateChat`'s toast**

Find:

```typescript
sileo.success({ title: 'Chat updated' })
```

Replace with:

```typescript
sileo.success({ title: i18n.t('chat:toast.chatUpdated') })
```

- [ ] **Step 4d: Translate `deleteChat`'s toast**

Find (this exact 1-line call — leave the `window.location` line above it,
whatever it currently reads, untouched):

```typescript
sileo.success({ title: 'Chat deleted', description: chat.title })
```

Replace with:

```typescript
sileo.success({
  title: i18n.t('chat:toast.chatDeleted'),
  description: chat.title
})
```

- [ ] **Step 5: Rewrite `src/renderer/components/chat/lcm-status-card.tsx` in full**

```typescript
import { CheckIcon, TriangleAlertIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Spinner } from '@/components/ui/spinner'
import { useLcmStatus } from '@/hooks/use-lcm-status'
import { cn } from '@/lib/utils'

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function LcmStatusCard({ chatId }: { chatId: string }) {
  const { t } = useTranslation('chat')
  const state = useLcmStatus(chatId)

  if (state.kind === 'idle') return null

  const baseClass =
    'mx-auto my-2 w-[calc(100%-8rem)] flex items-center gap-2 rounded-md px-3 py-2 text-xs md:max-w-3xl'

  if (state.kind === 'running') {
    return (
      <div className={cn(baseClass, 'bg-muted/60 text-muted-foreground')}>
        <Spinner className="size-3.5" />
        <span>{t('lcm.compacting')}</span>
      </div>
    )
  }

  if (state.kind === 'just_completed') {
    const { messagesBefore, messagesAfter, tokensSaved } = state.payload
    const compacted = Math.max(0, messagesBefore - messagesAfter)
    return (
      <div className={cn(baseClass, 'bg-muted/60 text-muted-foreground')}>
        <CheckIcon className="size-3.5" />
        <span>
          {t('lcm.compactedSummary', {
            count: compacted,
            tokens: formatTokens(tokensSaved)
          })}
        </span>
      </div>
    )
  }

  // error
  return (
    <div
      className={cn(
        baseClass,
        'border-destructive/40 text-destructive border bg-transparent'
      )}
    >
      <TriangleAlertIcon className="size-3.5" />
      <span>{t('lcm.compactionFailed')}</span>
    </div>
  )
}
```

- [ ] **Step 6: Verify**

Run: `pnpm typecheck:web && pnpm lint && pnpm format:check`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/renderer/components/messages-calling-tools.tsx src/renderer/components/massage-action.tsx src/renderer/components/chat-toc.tsx src/renderer/services/chat.ts src/renderer/components/chat/lcm-status-card.tsx
git commit -m "feat(i18n): wire chat namespace into message-calling-tools, message-action, chat-toc, chat services, and the LCM status card"
```

---

### Task 7: Whole-plan verification

**Files:** none (verification only — no code changes expected; if any check
below fails, fix in the file it names and re-run from that check).

- [ ] **Step 1: Confirm no bare hardcoded literals remain in the 11 touched files**

Run:

```bash
grep -n "placeholder=\"" src/renderer/components/multimodel-input.tsx
grep -n "aria-label=\"" src/renderer/components/multimodel-input.tsx src/renderer/components/messages.tsx
grep -n "title: '" src/renderer/components/multimodel-input.tsx src/renderer/hooks/use-upload.ts src/renderer/services/chat.ts
```

Expected: no matches (every one of these sites was rewired in Tasks 2-6). A
match means a task's rewrite didn't fully land — fix it in that file, not
here.

- [ ] **Step 2: Run the full pre-commit gate**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm i18n:check && pnpm test`
Expected: all green. If `pnpm test` fails only on the known PGlite WASM
teardown flake in `context-management/index.test.ts`, or only on the orphan
`TEST_IDS.providerModels.modelSelect` linkage failure (re-verify both causes
independently — `git status`/`git diff` on `model-picker.tsx` for the
latter — don't assume either without checking), that's the pre-existing,
documented state, not a regression from this plan.

- [ ] **Step 3: Run `pnpm i18n:audit` and record the before/after count**

Run: `pnpm i18n:audit`
Expected: the renderer-string count should have dropped by roughly the
~42 sites this plan targeted. Record the exact before/after numbers in the
final report — if the count didn't move as expected, or moved for an
unrelated reason (an ambient dirty-tree edit elsewhere, as happened during
the `menu` plan's own Task 5), say so explicitly rather than asserting
"unchanged" or "as expected" without checking.

- [ ] **Step 4: Confirm the two untouched test files still pass, unmodified**

Run:

```bash
git diff --stat tests/unit/renderer/components/citations-across-turns.test.ts tests/unit/renderer/components/message-spinner.test.ts
```

Expected: empty output (no diff — these files were never touched across
this whole plan, confirming Task 4's signature-preservation claim held).
