# Artifact Polish — Browser Chrome + Aesthetic Guardrails

## Problem

Artifacts today render in a plain `Card` with a title and two icon buttons. The wrapper gives no visual cue that the content is a live-rendered React component — it looks like any other tool-result card. And the LLM-generated React inside tends toward generic AI aesthetics (flat card grids, uniform padding, cyan accents on dark, gradient flourishes).

Two problems, one fix window: dress the **outside** so artifacts read as "this is a rendered app" at a glance, and steer the **inside** so the generated component has a distinctive point of view.

## Scope

This spec covers:

1. New browser-style chrome (traffic lights + fake URL pill) for the artifact card, with functional traffic lights and a clickable URL that reveals the saved `.tsx` file in Finder / the OS file manager.
2. Prompt-level design guardrails in `create-artifact.ts` distilled from the impeccable skill's philosophy.
3. Exposing `framer-motion` to the artifact sandbox so the LLM has real motion primitives.

Out of scope: adding new webfonts to the sandbox, adding new icon packs, cross-chat artifact browsing, backwards-compat shims for the old card.

## Design

### 1. Browser chrome

Replace the current `Card` + `CardHeader` structure in `src/renderer/components/calling-tools/artifact/artifact-card.tsx` with a custom chrome bar.

**Layout:**

```
┌─ chrome bar (~40px) ────────────────────────────────────────┐
│ ● ● ●   [ 🔒 artifact://7f3a1/corning-furukawa-ytd       ]  │
├─────────────────────────────────────────────────────────────┤
│  iframe body (400px inline / flex-1 in fullscreen)          │
└─────────────────────────────────────────────────────────────┘
```

- Three traffic lights on the left: 12×12px circles, `#ff5f57 / #febc2e / #28c840`, 8px gap, inset `0 0 0 0.5px rgba(0,0,0,0.1)` shadow.
- URL pill: takes remaining horizontal space, max width ~640px, centered. White background in light theme, `oklch(0.28 0.005 <brand-hue>)` in dark. `1px` soft border, `6px` radius. `ui-monospace 11.5px`, color `oklch(0.45 …)`.
- Chrome bar background: light theme `#ececea`; dark theme `oklch(0.22 0.005 <brand-hue>)`. 1px bottom border.
- Right slot: reserved for one future action icon; stays empty in v1.
- Outer container: `8px` radius, `1px` border, subtle drop shadow.

**Functional traffic lights (confirmed direction 1a):**

| Light      | Action                                                       | Replaces              |
| ---------- | ------------------------------------------------------------ | --------------------- |
| Red (●)    | Collapse card to chrome-only (~40px). Second click restores. | — (new)               |
| Yellow (●) | Toggle code preview.                                         | `CodeIcon` button     |
| Green (●)  | Toggle fullscreen.                                           | `MaximizeIcon` button |

Hover behavior: the corresponding glyph (`×`, `−`, `⤢`) fades in on the circle at ~60% opacity, matching native macOS. `title` attr on each circle for tooltip discoverability. `aria-label` for accessibility.

The old right-side `<CodeIcon>` and `<MaximizeIcon>` buttons are removed. All three actions now live in the traffic lights.

**Collapsed state:** when collapsed, the card shows only the chrome bar. Both the code preview area (if any) and the iframe are unmounted so the iframe doesn't keep running.

**Fullscreen mode:** same chrome bar, full viewport. Because we draw our own traffic lights, we no longer need the `isNativeFullscreen` offset hack (`paddingLeft: isNativeFullscreen ? 16 : 88`) — our chrome is self-contained. The `useIsNativeFullscreen` hook and its IPC subscription can be removed from this component.

**Escape key:** still closes fullscreen as today.

### 2. URL pill clicks open the file

**URL content:** `artifact://<short-id>/<slug>`

- `short-id` = first 5 chars of the UUID `artifactId`.
- `slug` = kebab-case of the title. Algorithm:
  1. Lowercase.
  2. Replace runs of whitespace + common punctuation with `-`.
  3. Trim leading/trailing `-`.
  4. Truncate to 40 chars.
  5. If the resulting string is empty (e.g., title was only emoji), use `untitled`.
- Non-ASCII characters are preserved as-is (raw-kebab). `康宁 YTD` → `康宁-ytd`. This avoids pulling in a transliterator and keeps the URL recognizable to the user.

**Interaction:** URL pill has `cursor: pointer`, subtle `background-color` tint on hover. Click calls `revealArtifactFile(chatId, artifactId)`.

**IPC wiring:**

1. New handler in `src/main/lib/ipc.ts`:
   ```ts
   safeHandle('reveal-artifact-file', (_, arg) => {
     const { chatId, artifactId } = arg as {
       chatId: string
       artifactId: string
     }
     const filePath = join(getArtifactsDir(), chatId, `${artifactId}.tsx`)
     if (existsSync(filePath)) shell.showItemInFolder(filePath)
   })
   ```
   Imports `existsSync` from `node:fs`, `join` from `node:path`, and `getArtifactsDir` from `./paths`.
2. New wrapper in `src/renderer/lib/ipc.ts`:
   ```ts
   export function revealArtifactFile(chatId: string, artifactId: string) {
     return window.electron.ipcRenderer.invoke('reveal-artifact-file', {
       chatId,
       artifactId
     })
   }
   ```

**Plumbing `chatId` and `artifactId` end-to-end:**

Today `create-artifact.ts` hardcodes `saveArtifact('shared', …)` — every artifact goes into a literal `shared/` folder rather than the chat it belongs to. This is inconsistent with `listArtifacts(chatId)` / `getArtifact(chatId, …)` and blocks per-chat reveal. We fix it now since we're already in this code.

Concrete wiring:

1. Convert `createArtifact` to a factory, mirroring the existing pattern for `googleMapsPlaces(setting)` / `imageGeneration(setting)`:
   ```ts
   export const createArtifact = (
     chatId: string
   ): AgentTool<typeof createArtifactSchema> => ({
     name: 'createArtifact',
     // …
     execute: async (_toolCallId, { title, code }) => {
       const artifactId = uuidV4()
       saveArtifact(chatId, artifactId, title, code).catch(() => {})
       return {
         content: [{ type: 'text', text: `Created artifact: ${title}` }],
         details: { type: 'artifact', artifactId, chatId, title, code }
       }
     }
   })
   ```
2. `bindCallingTools` (`src/main/lib/ai/utils/tool-binding-util.ts`) gains a `chatId: string` param and passes it to `createArtifact(chatId)`.
3. `chat.ts` already has the chat id in scope as `id` — pass it through at the `bindCallingTools({ …, chatId: id })` call site.
4. Renderer side: extend `ArtifactDetails` in `artifact-card.tsx` to `{ type, title, code, artifactId, chatId }`. The existing `messages-calling-tools.tsx` hands the raw `details` payload to `<ArtifactCard toolResult={output} />`, so once the main process adds `chatId` to `details`, it arrives automatically — no prop plumbing needed in the renderer beyond the type update.

### 3. Prompt-level design guardrails

Rewrite the `code` field description in `src/main/lib/ai/calling-tools/create-artifact.ts` to layer three things on top of today's import list:

**A. Design principles (concise):**

- Commit to ONE clear aesthetic direction per artifact (editorial, brutalist, refined, playful, technical-terminal, etc.) — never default to "clean dashboard".
- Typography: pair display feel with body feel via weight/size contrast. At least 1.25× ratio between size steps. Vary weights.
- Color: tint neutrals toward a single accent hue. Follow the 60-30-10 visual weight rule. One accent, used rarely.
- Space: varied spacing creates rhythm. Not uniform padding everywhere. Break grid for emphasis.
- Motion: use `framer-motion` for entrance and state changes only. Ease-out feel. No bounce.
- Data first: when visualizing data, make the data legible before decorating.

**B. Strict bans (the AI tells):**

- No gradient text (`background-clip: text` with gradient fill).
- No left/right border stripes > 1px as accent on cards/list items/callouts.
- No pure `#000` or `#fff` — always tint toward the accent.
- No glassmorphism/blur-card decoration.
- No identical card grids of icon + heading + text.
- No hero-metric template (giant number, tiny label, gradient accent).
- No cyan-on-dark, no purple-to-blue gradients.
- No monospace as shorthand for "technical".
- No centering everything — left-align text with asymmetry.

**C. Richer example:** replace today's minimal `BarChart` example with one that demonstrates typographic hierarchy, tasteful CSS-var palette, varied spacing, and a single `framer-motion` reveal. Still ≤ 50 lines.

**D. Expose `framer-motion`:**

In `src/renderer/sub-apps/artifacts/sandbox.tsx`:

```ts
import * as Motion from 'framer-motion'
// ...
const MODULE_REGISTRY = {
  // existing entries…
  'framer-motion': Motion
}
```

Add `framer-motion (motion, AnimatePresence, …)` to the tool description's "Available imports" list.

## Components & files touched

| File                                                               | Change                                                                                                                                                                                                                           |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/renderer/components/calling-tools/artifact/artifact-card.tsx` | Replace Card/CardHeader with custom chrome bar; implement functional traffic lights, collapsed state, URL pill with click-to-reveal. Remove `useIsNativeFullscreen` usage.                                                       |
| `src/renderer/lib/ipc.ts`                                          | Add `revealArtifactFile(chatId, artifactId)`.                                                                                                                                                                                    |
| `src/main/lib/ipc.ts`                                              | Add `reveal-artifact-file` handler using `shell.showItemInFolder`.                                                                                                                                                               |
| `src/main/lib/ai/calling-tools/create-artifact.ts`                 | Convert export to factory `createArtifact(chatId)`. Rewrite `code` schema description with principles, bans, richer example. Thread real `chatId` into `saveArtifact` and into the `details` payload (fixes the `'shared'` bug). |
| `src/main/lib/ai/utils/tool-binding-util.ts`                       | Add `chatId` param; call `createArtifact(chatId)`.                                                                                                                                                                               |
| `src/main/lib/server/routes/chat.ts`                               | Pass `chatId: id` at the `bindCallingTools(…)` call site.                                                                                                                                                                        |
| `src/main/lib/ai/calling-tools/index.ts`                           | Update re-export to reflect factory signature if needed.                                                                                                                                                                         |
| `src/renderer/sub-apps/artifacts/sandbox.tsx`                      | Register `framer-motion` in `MODULE_REGISTRY`.                                                                                                                                                                                   |

No schema changes, no new deps.

## Data flow

1. LLM calls `createArtifact` → main process saves `<chatId>/<artifactId>.tsx` and `.json`, returns `details = { type, title, code, artifactId, chatId }`.
2. Renderer's `messages-calling-tools.tsx` renders `<ArtifactCard toolResult={details} />`.
3. Card mounts sandbox iframe, posts theme + render messages with the code.
4. User interacts:
   - Red → local `collapsed` state toggled, iframe unmounted.
   - Yellow → local `showCode` state toggled.
   - Green → local `expanded` state toggled; portal-renders fullscreen copy.
   - URL pill click → `revealArtifactFile(chatId, artifactId)` → IPC → `shell.showItemInFolder(path)`.

## Accessibility

- Each traffic light is a `<button>` with an `aria-label` (`"Collapse"`, `"Toggle code"`, `"Toggle fullscreen"`).
- URL pill is a `<button>` with `aria-label={`Reveal ${title} in file manager`}`.
- Focus states: visible ring at `:focus-visible` on all four controls, using the existing app's ring color.
- Traffic lights have color + glyph on hover — color is not the only affordance.

## Error handling

- `reveal-artifact-file` silently no-ops if the file doesn't exist. We don't surface an error because there's nothing the user can do, and the file missing is always a prior bug — log via `logger.warn` but do not raise a toast.
- The `safeHandle` wrapper already catches and logs exceptions in the IPC layer.
- If `chatId` is undefined on the card (e.g., old tool results from before this change), the URL pill is disabled (no click handler, reduced opacity, cursor default).

## Testing

Manual verification path:

1. Trigger an artifact generation that produces a React component.
2. Verify the chrome bar shows three traffic lights and a URL pill.
3. Hover each traffic light — confirm the glyph (`×`, `−`, `⤢`) fades in and the tooltip shows.
4. Click red → card collapses to just the bar; click red again → restores.
5. Click yellow → code preview appears; click again → hides.
6. Click green → fullscreen; press Esc → returns. Repeat in Electron native-fullscreen mode to confirm no overlap with the OS traffic lights.
7. Click the URL pill → OS file manager opens with the `.tsx` file selected.
8. Switch theme light ↔ dark; verify the chrome bar tints correctly.
9. Trigger a new artifact that uses `framer-motion` (re-run the Corning/Furukawa YTD prompt or ask for an animated demo) — confirm the motion renders and no console errors.
10. Verify the `chatId` fix: the saved file appears under `~/.app/Artifacts/<actual-chatId>/…`, not under `shared/`.

No automated tests planned — the card is UI-glue and the prompt-level changes are only verifiable by qualitative inspection.

## Risks

- **Chrome overhead**: the chrome bar adds ~40px on top of today's ~32px header. Net +8px per artifact. Acceptable.
- **Existing artifacts stranded under `shared/`**: old artifacts written before this change live in `~/.app/Artifacts/shared/`. They will not be reachable via the new per-chat reveal because the card now has a real `chatId`. Mitigation: on app startup, a one-time migration pass moves each `shared/<artifactId>.{tsx,json}` into the correct chat directory if the `chatId` can be recovered from the message that referenced it. If not, leave them in `shared/` — they're a fixed set, and new artifacts land correctly. Out of scope for this spec; note as a follow-up.
- **Prompt bloat**: adding principles + bans + a larger example grows the tool description by ~2-3× its current size. This is a token cost on every chat turn that binds this tool. Acceptable given the tool only binds when the artifact feature is enabled.
- **Hover glyph on traffic lights**: some users never hover (trackpad tap). Tooltips and `title` attr mitigate but don't fully solve. Accepted — discoverability is imperfect but matches native macOS.
