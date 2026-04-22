# Artifact Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap rendered artifacts in browser-style chrome with functional traffic lights, make the URL bar reveal the saved `.tsx` in Finder, and steer LLM-generated artifact code toward distinctive, non-AI-slop aesthetics by rewriting the tool prompt and exposing `framer-motion`.

**Architecture:** The artifact card's existing `Card` + `CardHeader` structure is replaced by a custom chrome bar composed of three traffic-light buttons (collapse / code-toggle / fullscreen) and a clickable URL pill. A new `reveal-artifact-file` IPC handler uses `shell.showItemInFolder`. The `createArtifact` tool becomes a factory receiving the current `chatId` (fixing the pre-existing `saveArtifact('shared', …)` bug) and its prompt grows a concise design-principles + bans section plus a richer example. `framer-motion` joins the sandbox module registry so the LLM can reference it.

**Tech Stack:** Electron 29 (main + renderer), React 19, TypeScript strict, Tailwind, shadcn/ui (Card/Button), Vercel AI SDK tools via `@mariozechner/pi-agent-core`, `uuid`, Vitest for the pure slug utility.

---

## File Structure

| File                                                               | Role                                                                                                                                                                                                 | Action      |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `src/shared/utils/artifact-slug.ts`                                | Pure helpers: `artifactSlug(title)` and `artifactShortId(uuid)` used to render the URL pill.                                                                                                         | **Create**  |
| `src/shared/utils/artifact-slug.test.ts`                           | Unit tests for the two helpers.                                                                                                                                                                      | **Create**  |
| `src/main/lib/ai/calling-tools/create-artifact.ts`                 | Convert to factory `createArtifact(chatId)`; include `chatId` in details; rewrite the `code` schema description with design principles, strict bans, and a richer example that uses `framer-motion`. | **Modify**  |
| `src/main/lib/ai/utils/tool-binding-util.ts`                       | Accept a `chatId: string` param; call `createArtifact(chatId)`.                                                                                                                                      | **Modify**  |
| `src/main/lib/server/routes/chat.ts`                               | Pass `chatId: id` into `bindCallingTools(…)`.                                                                                                                                                        | **Modify**  |
| `src/main/lib/ipc.ts`                                              | Add `reveal-artifact-file` handler using `shell.showItemInFolder`.                                                                                                                                   | **Modify**  |
| `src/renderer/lib/ipc.ts`                                          | Export `revealArtifactFile(chatId, artifactId)` wrapper.                                                                                                                                             | **Modify**  |
| `src/renderer/sub-apps/artifacts/sandbox.tsx`                      | Register `framer-motion` in `MODULE_REGISTRY`.                                                                                                                                                       | **Modify**  |
| `src/renderer/components/calling-tools/artifact/artifact-card.tsx` | Replace Card/CardHeader with a browser chrome bar (traffic lights + URL pill); implement collapsed state; remove `useIsNativeFullscreen`.                                                            | **Rewrite** |

Ordering keeps typecheck green at every commit. Task 1 ships the chatId plumbing and makes `chatId` available on the tool-result details payload while leaving the card UI untouched. Task 5 consumes it. Each task ends with `pnpm typecheck && pnpm lint` and a commit.

---

## Task 1: Thread `chatId` through tool binding (fixes `saveArtifact('shared', …)` bug)

**Files:**

- Modify: `src/main/lib/ai/calling-tools/create-artifact.ts`
- Modify: `src/main/lib/ai/utils/tool-binding-util.ts`
- Modify: `src/main/lib/server/routes/chat.ts`

**What this delivers:** new artifacts save under `~/.app/Artifacts/<real-chatId>/<uuid>.tsx` instead of `shared/<uuid>.tsx`, and the renderer's tool-result payload carries `chatId` alongside `artifactId`. No UI change yet.

- [ ] **Step 1: Convert `createArtifact` to a factory and include `chatId` in details**

Replace the entirety of `src/main/lib/ai/calling-tools/create-artifact.ts` with:

```ts
import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { v4 as uuidV4 } from 'uuid'

import { saveArtifact } from '../artifacts'

const createArtifactSchema = Type.Object({
  title: Type.String({
    description: 'Short title for the artifact (shown in the card header)'
  }),
  code: Type.String({
    description: `A self-contained React component in TSX using CommonJS require().
Available imports:
- react (React, useState, useEffect, useMemo, useCallback, etc.)
- recharts (LineChart, BarChart, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Line, Bar, Pie, Cell, Area, AreaChart, etc.)
- lucide-react (any icon, e.g. TrendingUp, Users, Globe, etc.)
- @/ui/button (Button)
- @/ui/card (Card, CardContent, CardHeader, CardTitle)
- @/ui/badge (Badge)
- @/ui/table (Table, TableBody, TableCell, TableHead, TableHeader, TableRow)
- @/ui/tabs (Tabs, TabsContent, TabsList, TabsTrigger)

Use standard Tailwind CSS classes for styling (p-4, text-sm, flex, grid, etc.).
IMPORTANT: For dimensions/sizing, use inline style={{}} instead of Tailwind arbitrary values like h-[380px] — arbitrary values are NOT available in the sandbox CSS.
Use CSS variables for chart colors: var(--chart-1) through var(--chart-5).
For recharts, set width and height as numbers directly on the chart component — do NOT rely on ResponsiveContainer with percentage heights.
Export default a React component via module.exports.

Example:
const React = require('react')
const { BarChart, Bar, XAxis, YAxis, Tooltip } = require('recharts')
const { Card, CardHeader, CardTitle, CardContent } = require('@/ui/card')

const data = [{ name: 'A', value: 40 }, { name: 'B', value: 70 }]

function Chart() {
  return (
    <Card>
      <CardHeader><CardTitle>My Chart</CardTitle></CardHeader>
      <CardContent>
        <BarChart width={600} height={300} data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="var(--chart-1)" />
        </BarChart>
      </CardContent>
    </Card>
  )
}

module.exports = { default: Chart }`
  })
})

export const createArtifact = (
  chatId: string
): AgentTool<typeof createArtifactSchema> => ({
  name: 'createArtifact',
  label: 'Create Artifact',
  description:
    'Create a rich visual artifact (chart, table, dashboard, comparison, etc.) rendered as a live React component. Use this when data would be better presented visually rather than as plain text — for example after collecting research data, comparing options, or analyzing statistics. The component will be rendered in an interactive sandbox with Tailwind CSS styling.',
  parameters: createArtifactSchema,
  execute: async (_toolCallId, { title, code }) => {
    const artifactId = uuidV4()

    // Persist artifact to disk (fire-and-forget)
    saveArtifact(chatId, artifactId, title, code).catch(() => {})

    return {
      content: [{ type: 'text' as const, text: `Created artifact: ${title}` }],
      details: {
        type: 'artifact',
        artifactId,
        chatId,
        title,
        code
      }
    }
  }
})
```

> Prompt content stays identical in this step — Task 6 rewrites the `code` description. Only the factory signature and `details` payload change here.

- [ ] **Step 2: Add `chatId` param to `bindCallingTools`**

Modify `src/main/lib/ai/utils/tool-binding-util.ts`. In the params block (around line 40) add `chatId: string`, and at the single call site (around line 71) change to `createArtifact(chatId)`:

```ts
export function bindCallingTools({
  advancedTools,
  setting,
  chatModel,
  apiKey,
  mcpTools = [],
  chatId
}: {
  advancedTools: AdvancedTools[]
  setting: Settings
  chatModel?: Model<string>
  apiKey?: string
  mcpTools?: McpTools[]
  chatId: string
}): ErasedTool[] {
```

And:

```ts
if (enabled('createArtifact')) tools.push(createArtifact(chatId))
```

- [ ] **Step 3: Pass `chatId: id` at the `bindCallingTools` call site**

In `src/main/lib/server/routes/chat.ts` around line 172, extend the argument object:

```ts
const tools = bindCallingTools({
  advancedTools,
  setting,
  chatModel,
  apiKey,
  mcpTools,
  chatId: id
})
```

- [ ] **Step 4: Update the renderer's `ArtifactDetails` interface**

In `src/renderer/components/calling-tools/artifact/artifact-card.tsx` extend the interface so the new fields flow through. No behavioural change in this task:

```ts
interface ArtifactDetails {
  type: 'artifact'
  title: string
  code: string
  artifactId: string
  chatId: string
}
```

- [ ] **Step 5: Verify typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/main/lib/ai/calling-tools/create-artifact.ts \
        src/main/lib/ai/utils/tool-binding-util.ts \
        src/main/lib/server/routes/chat.ts \
        src/renderer/components/calling-tools/artifact/artifact-card.tsx
git commit -m "fix(artifact): thread real chatId into createArtifact tool"
```

---

## Task 2: Add slug + short-id utility (shared, with tests)

**Files:**

- Create: `src/shared/utils/artifact-slug.ts`
- Create: `src/shared/utils/artifact-slug.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/shared/utils/artifact-slug.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { artifactShortId, artifactSlug } from './artifact-slug'

describe('artifactSlug', () => {
  it('lowercases and joins words with dashes', () => {
    expect(artifactSlug('Corning Furukawa YTD')).toBe('corning-furukawa-ytd')
  })

  it('collapses punctuation and whitespace into single dashes', () => {
    expect(artifactSlug('Hello,   world!!  2026')).toBe('hello-world-2026')
  })

  it('trims leading and trailing dashes', () => {
    expect(artifactSlug('   -- foo -- ')).toBe('foo')
  })

  it('truncates to 40 chars', () => {
    const long = 'a'.repeat(80)
    expect(artifactSlug(long)).toHaveLength(40)
  })

  it('preserves non-ASCII characters', () => {
    expect(artifactSlug('康宁 YTD')).toBe('康宁-ytd')
  })

  it('returns "untitled" for empty/whitespace input', () => {
    expect(artifactSlug('')).toBe('untitled')
    expect(artifactSlug('   ')).toBe('untitled')
  })

  it('returns "untitled" when nothing survives slugging', () => {
    expect(artifactSlug('!!!')).toBe('untitled')
  })
})

describe('artifactShortId', () => {
  it('returns the first 5 characters of the id', () => {
    expect(artifactShortId('7f3a1b2c-0000-0000-0000-000000000000')).toBe(
      '7f3a1'
    )
  })

  it('handles short inputs without padding', () => {
    expect(artifactShortId('ab')).toBe('ab')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/shared/utils/artifact-slug.test.ts`
Expected: FAIL — module `./artifact-slug` not found.

- [ ] **Step 3: Implement the helpers**

Create `src/shared/utils/artifact-slug.ts`:

```ts
const MAX_SLUG_LENGTH = 40

export function artifactSlug(title: string): string {
  const cleaned = title
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '')

  return cleaned.length > 0 ? cleaned : 'untitled'
}

export function artifactShortId(id: string): string {
  return id.slice(0, 5)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/shared/utils/artifact-slug.test.ts`
Expected: 8 passing.

- [ ] **Step 5: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/shared/utils/artifact-slug.ts src/shared/utils/artifact-slug.test.ts
git commit -m "feat(artifact): add slug and short-id helpers"
```

---

## Task 3: Add main-process IPC handler for file reveal

**Files:**

- Modify: `src/main/lib/ipc.ts`

- [ ] **Step 1: Add imports**

At the top of `src/main/lib/ipc.ts`, add `existsSync` from `fs` and `join` from `path`, plus `getArtifactsDir` from `./paths`. The existing import of `getLogsDir` from `./paths` needs to become:

```ts
import { existsSync } from 'fs'
import { join } from 'path'

import { app, dialog, ipcMain, nativeTheme, shell } from 'electron'

import {
  updaterCheck,
  updaterDownload,
  updaterGetState,
  updaterInstall,
  updaterSetAutoDownload
} from './auto-updater'
import { logger } from './logger'
import { getArtifactsDir, getLogsDir } from './paths'
```

- [ ] **Step 2: Register the handler**

In the `setupIPC()` function, immediately below the existing `safeHandle('open-logs-dir', …)` block (around line 160), add:

```ts
safeHandle('reveal-artifact-file', (_, arg: unknown) => {
  const { chatId, artifactId } = arg as {
    chatId: string
    artifactId: string
  }
  const filePath = join(getArtifactsDir(), chatId, `${artifactId}.tsx`)
  if (existsSync(filePath)) {
    shell.showItemInFolder(filePath)
  } else {
    logger.warn('app', 'reveal-artifact-file: file missing', {
      chatId,
      artifactId,
      filePath
    })
  }
})
```

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/main/lib/ipc.ts
git commit -m "feat(artifact): add reveal-artifact-file IPC handler"
```

---

## Task 4: Add renderer IPC wrapper

**Files:**

- Modify: `src/renderer/lib/ipc.ts`

- [ ] **Step 1: Add the wrapper**

Append to `src/renderer/lib/ipc.ts` (after `updaterSetAutoDownload`, keeping the file's grouping):

```ts
export function revealArtifactFile(chatId: string, artifactId: string) {
  return window.electron.ipcRenderer.invoke('reveal-artifact-file', {
    chatId,
    artifactId
  })
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/lib/ipc.ts
git commit -m "feat(artifact): add revealArtifactFile renderer wrapper"
```

---

## Task 5: Replace artifact card with browser chrome

**Files:**

- Rewrite: `src/renderer/components/calling-tools/artifact/artifact-card.tsx`

**What this delivers:** traffic-light chrome with functional red/yellow/green buttons, a clickable URL pill, a collapsed state, and fullscreen behavior that no longer depends on native-fullscreen detection.

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `src/renderer/components/calling-tools/artifact/artifact-card.tsx` with:

```tsx
import { MinusIcon, MaximizeIcon, XIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { artifactShortId, artifactSlug } from '@shared/utils/artifact-slug'

import { revealArtifactFile } from '@/lib/ipc'
import { cn } from '@/lib/utils'

interface ArtifactDetails {
  type: 'artifact'
  title: string
  code: string
  artifactId: string
  chatId: string
}

function getArtifactSandboxUrl(): string {
  const devUrl = import.meta.env.ELECTRON_RENDERER_URL as string | undefined
  if (import.meta.env.DEV && devUrl) {
    return `${devUrl}/sub-apps/artifacts/index.html`
  }
  return '../sub-apps/artifacts/index.html'
}

function sendToIframe(
  iframe: HTMLIFrameElement | null,
  code: string,
  title: string
) {
  const win = iframe?.contentWindow
  if (!win || !code) return
  const theme = window.localStorage.getItem('vite-ui-theme') ?? 'system'
  win.postMessage({ type: 'theme', theme }, '*')
  win.postMessage({ type: 'render', code, artifactId: title }, '*')
}

type LightVariant = 'red' | 'yellow' | 'green'

const LIGHT_COLORS: Record<LightVariant, string> = {
  red: '#ff5f57',
  yellow: '#febc2e',
  green: '#28c840'
}

function TrafficLight({
  variant,
  onClick,
  ariaLabel,
  children
}: {
  variant: LightVariant
  onClick: () => void
  ariaLabel: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="group relative flex h-3 w-3 items-center justify-center rounded-full transition-opacity focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none"
      style={{
        backgroundColor: LIGHT_COLORS[variant],
        boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.12)'
      }}
    >
      <span className="pointer-events-none opacity-0 transition-opacity group-hover:opacity-60 flex items-center justify-center">
        {children}
      </span>
    </button>
  )
}

function UrlPill({
  title,
  artifactId,
  chatId,
  disabled
}: {
  title: string
  artifactId: string
  chatId: string
  disabled?: boolean
}) {
  const slug = artifactSlug(title)
  const shortId = artifactShortId(artifactId)

  const handleClick = () => {
    if (disabled) return
    revealArtifactFile(chatId, artifactId)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={`Reveal ${title} in file manager`}
      title={disabled ? title : `Reveal in file manager`}
      className={cn(
        'min-w-0 max-w-[640px] flex-1 rounded-md border px-2.5 py-1 text-left font-mono text-[11.5px] leading-none',
        'border-border/60 bg-background text-muted-foreground transition-colors',
        !disabled && 'hover:bg-muted cursor-pointer',
        disabled && 'opacity-60'
      )}
    >
      <span className="mr-1 opacity-60">🔒</span>
      <span className="text-foreground/50">artifact://</span>
      <span className="truncate">
        {shortId}/{slug}
      </span>
    </button>
  )
}

function ChromeBar({
  title,
  artifactId,
  chatId,
  onCollapse,
  onToggleCode,
  onToggleFullscreen
}: {
  title: string
  artifactId: string
  chatId: string
  onCollapse: () => void
  onToggleCode: () => void
  onToggleFullscreen: () => void
}) {
  return (
    <div className="bg-muted/70 flex h-10 items-center gap-3 border-b px-3">
      <div className="flex items-center gap-2">
        <TrafficLight
          variant="red"
          onClick={onCollapse}
          ariaLabel="Collapse artifact"
        >
          <XIcon size={8} strokeWidth={3} />
        </TrafficLight>
        <TrafficLight
          variant="yellow"
          onClick={onToggleCode}
          ariaLabel="Toggle code"
        >
          <MinusIcon size={8} strokeWidth={3} />
        </TrafficLight>
        <TrafficLight
          variant="green"
          onClick={onToggleFullscreen}
          ariaLabel="Toggle fullscreen"
        >
          <MaximizeIcon size={7} strokeWidth={3} />
        </TrafficLight>
      </div>
      <div className="flex min-w-0 flex-1 justify-center">
        <UrlPill title={title} artifactId={artifactId} chatId={chatId} />
      </div>
      <div className="w-[64px]" aria-hidden />
    </div>
  )
}

export function ArtifactCard({ toolResult }: { toolResult: ArtifactDetails }) {
  const inlineIframeRef = useRef<HTMLIFrameElement>(null)
  const fullscreenIframeRef = useRef<HTMLIFrameElement>(null)
  const inlineReady = useRef(false)
  const fullscreenReady = useRef(false)
  const [expanded, setExpanded] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const handleInlineLoad = useCallback(() => {
    inlineReady.current = true
    sendToIframe(inlineIframeRef.current, toolResult.code, toolResult.title)
  }, [toolResult.code, toolResult.title])

  const handleFullscreenLoad = useCallback(() => {
    fullscreenReady.current = true
    sendToIframe(fullscreenIframeRef.current, toolResult.code, toolResult.title)
  }, [toolResult.code, toolResult.title])

  useEffect(() => {
    if (inlineReady.current && !collapsed) {
      sendToIframe(inlineIframeRef.current, toolResult.code, toolResult.title)
    }
  }, [toolResult.code, toolResult.title, collapsed])

  useEffect(() => {
    if (fullscreenReady.current && expanded) {
      sendToIframe(
        fullscreenIframeRef.current,
        toolResult.code,
        toolResult.title
      )
    }
  }, [toolResult.code, toolResult.title, expanded])

  useEffect(() => {
    if (!expanded) fullscreenReady.current = false
  }, [expanded])

  // When the inline card is collapsed we unmount its iframe; reset the
  // ready flag so the next mount re-sends the code.
  useEffect(() => {
    if (collapsed) inlineReady.current = false
  }, [collapsed])

  useEffect(() => {
    if (!expanded) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [expanded])

  const inlineChrome = (
    <ChromeBar
      title={toolResult.title}
      artifactId={toolResult.artifactId}
      chatId={toolResult.chatId}
      onCollapse={() => setCollapsed((c) => !c)}
      onToggleCode={() => setShowCode((s) => !s)}
      onToggleFullscreen={() => setExpanded(true)}
    />
  )

  const codePreview = showCode && !collapsed && (
    <pre className="bg-muted/50 max-h-60 overflow-auto border-b p-3 text-xs">
      <code>{toolResult.code}</code>
    </pre>
  )

  return (
    <>
      <div
        className="border-border/70 bg-card overflow-hidden rounded-lg border shadow-sm"
        style={expanded ? { display: 'none' } : undefined}
      >
        {inlineChrome}
        {codePreview}
        {!collapsed && (
          <iframe
            ref={inlineIframeRef}
            src={getArtifactSandboxUrl()}
            onLoad={handleInlineLoad}
            className="w-full border-0"
            style={{ height: '400px' }}
            sandbox="allow-scripts allow-same-origin"
            title={toolResult.title}
          />
        )}
      </div>

      {expanded &&
        createPortal(
          <div className="bg-background fixed inset-0 z-50 flex flex-col">
            <ChromeBar
              title={toolResult.title}
              artifactId={toolResult.artifactId}
              chatId={toolResult.chatId}
              onCollapse={() => setExpanded(false)}
              onToggleCode={() => setShowCode((s) => !s)}
              onToggleFullscreen={() => setExpanded(false)}
            />
            {showCode && (
              <pre className="bg-muted/50 max-h-60 overflow-auto border-b p-3 text-xs">
                <code>{toolResult.code}</code>
              </pre>
            )}
            <iframe
              ref={fullscreenIframeRef}
              src={getArtifactSandboxUrl()}
              onLoad={handleFullscreenLoad}
              className="w-full flex-1 border-0"
              sandbox="allow-scripts allow-same-origin"
              title={toolResult.title}
            />
          </div>,
          document.body
        )}
    </>
  )
}
```

Notes on intentional deviations from the spec's behavior table:

- In fullscreen, **red** closes fullscreen (not "collapse the card"). That's the natural analogue in that context, and is what the user actually wants when they're in fullscreen. **Green** is also mapped to close in that context because there's nowhere further to expand.
- The hover glyph uses Lucide `XIcon`, `MinusIcon`, `MaximizeIcon` at 7–8px, matching the proportions of real macOS glyphs.

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass.

- [ ] **Step 3: Manual smoke test**

Start the dev server in a separate terminal (`pnpm dev`), then in a chat with the artifact tool enabled, trigger any artifact generation (e.g., "make a simple bar chart of three categories"). Verify:

1. Chrome bar shows three traffic lights + URL pill centered.
2. Hover each light → glyph fades in.
3. Red click → card collapses to the bar. Red click again → restores, iframe re-renders.
4. Yellow click → code preview appears; click again → hides.
5. Green click → fullscreen. Esc or red click → exits.
6. URL pill click → Finder opens with the `.tsx` file selected at `~/.app/Artifacts/<chatId>/<uuid>.tsx`.
7. Light/dark theme swap: chrome bar re-tints via Tailwind tokens.

If any step fails, fix before proceeding.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/calling-tools/artifact/artifact-card.tsx
git commit -m "feat(artifact): replace card header with browser-chrome traffic lights"
```

---

## Task 6: Expose `framer-motion` and rewrite the prompt with design guardrails

**Files:**

- Modify: `src/renderer/sub-apps/artifacts/sandbox.tsx`
- Modify: `src/main/lib/ai/calling-tools/create-artifact.ts`

- [ ] **Step 1: Register `framer-motion` in the sandbox module registry**

Modify `src/renderer/sub-apps/artifacts/sandbox.tsx`. Add the import at the top with the other wildcard imports:

```ts
import * as Motion from 'framer-motion'
```

Then extend `MODULE_REGISTRY` (currently lines 19-35):

```ts
const MODULE_REGISTRY: Record<string, unknown> = {
  react: React,
  recharts: Recharts,
  'lucide-react': LucideIcons,
  'framer-motion': Motion,
  '@/ui/button': { Button },
  '@/ui/card': { Card, CardContent, CardHeader, CardTitle },
  '@/ui/badge': { Badge },
  '@/ui/table': {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
  },
  '@/ui/tabs': { Tabs, TabsContent, TabsList, TabsTrigger }
}
```

- [ ] **Step 2: Rewrite the `code` description in `create-artifact.ts`**

In `src/main/lib/ai/calling-tools/create-artifact.ts`, replace the `description` value inside `Type.String({ description: … })` with the following (keep the rest of the file — the factory shape from Task 1 — intact):

```
A self-contained React component in TSX using CommonJS require(). The component renders inside a browser-chrome-wrapped card in a live chat. Treat every artifact as a small, distinctive design piece — not a default dashboard.

AVAILABLE IMPORTS:
- react (React, useState, useEffect, useMemo, useCallback, useRef, …)
- recharts (LineChart, AreaChart, BarChart, PieChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, Area, Bar, Pie, Cell, …)
- framer-motion (motion, AnimatePresence, useMotionValue, useTransform, …)
- lucide-react (any icon)
- @/ui/button (Button)
- @/ui/card (Card, CardContent, CardHeader, CardTitle)
- @/ui/badge (Badge)
- @/ui/table (Table, TableBody, TableCell, TableHead, TableHeader, TableRow)
- @/ui/tabs (Tabs, TabsContent, TabsList, TabsTrigger)

STYLING:
- Tailwind utility classes. For dimensions, prefer inline style={{}} over arbitrary values like h-[380px] — arbitrary values are NOT available in the sandbox CSS.
- Chart colors: var(--chart-1) through var(--chart-5).
- Recharts: pass width and height as numbers directly on the chart component. Do NOT rely on ResponsiveContainer with percentage heights.
- Export default a React component via module.exports.

DESIGN PRINCIPLES (apply every time):
1. Commit to ONE aesthetic direction per artifact — editorial, brutalist, refined, playful, terminal/bloomberg, hand-drawn, etc. Never default to "clean generic dashboard". Pick a direction before writing markup.
2. Typography hierarchy via contrast: at least 1.25× size ratio between levels, varied weights (400/500/700). Use no more than three sizes. Labels can be small uppercase with letter-spacing; body text should not.
3. Color: a single accent hue; tint neutrals subtly toward it. Follow 60-30-10 weight (neutral / secondary / accent). The accent should be rare — that is what gives it force.
4. Space: rhythm through varied spacing, not uniform padding. Tight groupings next to generous separations. Break the grid intentionally for emphasis.
5. Motion: use framer-motion for entrance reveals and state transitions only. Ease-out feel (or transition={{ type: 'spring', stiffness: 180, damping: 22 }}). No bouncy/elastic easing. Never animate decorative elements that don't serve comprehension.
6. Data first: when showing data, make it legible before decorating. Axis labels, scales, and units should be unambiguous.
7. Left-align text; avoid centering everything. Asymmetry reads as designed; centered columns read as templated.

STRICT BANS (these are AI tells — NEVER produce them):
- Gradient text (background-clip: text with gradient fill).
- Side-stripe borders greater than 1px on cards/list items/callouts (border-left: 3px solid … and variants).
- Pure #000 or #fff. Always tint.
- Glassmorphism/blur decoration.
- Identical card grids of icon + heading + text repeated endlessly.
- Hero-metric template (giant number, tiny label, gradient accent).
- Cyan-on-dark or purple-to-blue gradients.
- Monospace as shorthand for "technical".

EXAMPLE (good — demonstrates hierarchy, restraint, motion used meaningfully):
const React = require('react')
const { motion } = require('framer-motion')
const { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } = require('recharts')

const data = [
  { d: 'Jan', a: 100, b: 100 },
  { d: 'Feb', a: 108, b: 103 },
  { d: 'Mar', a: 112, b: 107 },
  { d: 'Apr', a: 119, b: 109 },
  { d: 'May', a: 124, b: 118 },
  { d: 'Jun', a: 132, b: 124 }
]

function YtdChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ padding: '28px 24px 20px' }}
    >
      <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: 4 }}>
        YTD Performance
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>
        Corning &amp; Furukawa
      </div>
      <div style={{ display: 'flex', gap: 24, marginTop: 12, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13 }}>
        <span>GLW <span style={{ color: 'var(--chart-1)' }}>+24.1%</span></span>
        <span>5801.T <span style={{ color: 'var(--chart-2)' }}>+18.3%</span></span>
      </div>
      <div style={{ marginTop: 18 }}>
        <LineChart width={600} height={240} data={data}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="d" stroke="var(--muted-foreground)" tickLine={false} />
          <YAxis stroke="var(--muted-foreground)" tickLine={false} domain={[95, 140]} />
          <Tooltip />
          <Line type="monotone" dataKey="a" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="b" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
        </LineChart>
      </div>
    </motion.div>
  )
}

module.exports = { default: YtdChart }
```

> The description is a JavaScript template literal (enclosed in backticks in the source). The example block above uses single quotes throughout and contains no backticks or `${…}`, so no escaping is needed. If you add any backtick or `${` to the description text later, escape it with a leading backslash.

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass.

- [ ] **Step 4: Manual regression — aesthetic quality**

Start `pnpm dev`, then re-run the prompt that originally produced mediocre output:

> 用 Artifacts 功能绘制康宁和古河电工(日股)YTD走势图, 数据你在网上搜.

Verify qualitatively:

1. Output does NOT exhibit any banned pattern (gradient text, side stripes > 1px, hero-metric template, card grids, etc.).
2. Motion is present — there's a noticeable entrance animation on the chart or at least one element.
3. Typography has clear hierarchy (at least two size levels, varied weights).
4. Color usage follows 60-30-10 — most of the surface is neutral, with restrained accents.

Try one or two more prompts (a comparison table, a dashboard of imaginary signups) to confirm the model doesn't collapse into the same template each time.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/sub-apps/artifacts/sandbox.tsx \
        src/main/lib/ai/calling-tools/create-artifact.ts
git commit -m "feat(artifact): expose framer-motion and steer prompt toward distinctive aesthetics"
```

---

## Post-implementation verification

- [ ] **Typecheck whole repo**

```bash
pnpm typecheck
```

Expected: pass.

- [ ] **Lint whole repo**

```bash
pnpm lint
```

Expected: pass.

- [ ] **Run all tests**

```bash
pnpm test
```

Expected: pass, including the new `artifact-slug.test.ts` (8 cases).

- [ ] **End-to-end smoke**

With `pnpm dev` running:

1. Trigger an artifact in a real chat — confirm it lands at `~/.app/Artifacts/<real-chatId>/<uuid>.tsx`, not under `shared/`.
2. Click the URL pill — Finder reveals the file.
3. Try the three traffic lights — all work.
4. Re-run the Corning/Furukawa prompt — output is qualitatively nicer than the pre-change baseline.
