# AgentX Visual Modernization — Design Spec

**Date:** 2026-06-02
**Status:** Approved, pending plan
**Scope:** AgentX feature surface only (chat / workforce / knowledge / dashboard + drawers, dialogs, empty states). Rest of Exodus untouched.

## Goal

Bring AgentX's visual language to a modern desktop-app standard inspired by a TweetDeck/Perch-style layered card aesthetic, while keeping Exodus's existing brand identity (green primary) and AgentX's existing information architecture (page-switching, not user-configurable columns). The result should feel airy, colorful in the right places, and motion-aware — without re-skinning the rest of the application.

## Non-goals

- Restructuring AgentX's IA (no Perch-style configurable columns).
- Re-skinning Exodus outside AgentX.
- Replacing Dicebear avatars with letter-initial avatars.
- Adding new product features. Visual + close-range interaction polish only.

---

## 1. Design tokens

A new AgentX-scoped token layer sits on top of the existing shadcn theme. Tokens are CSS custom properties under the `--ax-*` prefix, defined in `globals.css` inside the existing `:root` and `.dark` blocks. Components consume them via Tailwind arbitrary values (`bg-[var(--ax-surface)]`) so light/dark switches automatically with the existing `.dark` class.

### Color tokens

| Token                 | Light                  | Dark                       | Purpose                                                               |
| --------------------- | ---------------------- | -------------------------- | --------------------------------------------------------------------- |
| `--ax-canvas`         | `#F5F3F0` (warm grey)  | `#15171C` (cool deep grey) | Outer page background under the cards                                 |
| `--ax-surface`        | `#FFFFFF`              | `#1D2027`                  | Card background (the three main columns and major content cards)      |
| `--ax-surface-sunken` | `#FBFAF7`              | `#23262E`                  | Sub-cards inside a surface (employee cards, KPI cards, composer band) |
| `--ax-border`         | `#F0EEE9`              | `#2A2E37`                  | Subtle dividers; never used as the primary edge — shadow does that    |
| `--ax-text`           | `oklch(0.16 0.02 160)` | `#E6E8EC`                  | Primary text                                                          |
| `--ax-text-muted`     | `#888888`              | `#7D838F`                  | Secondary text                                                        |
| `--ax-primary`        | `oklch(0.52 0.17 160)` | `oklch(0.55 0.17 160)`     | Exodus green — actions, active state, send button, FAB-equivalents    |
| `--ax-primary-soft`   | `oklch(0.92 0.04 160)` | `oklch(0.30 0.08 160)`     | Soft chips, active item background at ~12% saturation                 |
| `--ax-primary-faint`  | `oklch(0.97 0.02 160)` | `oklch(0.22 0.05 160)`     | Subtlest tint (active conversation row 6%)                            |
| `--ax-success`        | `#10B981`              | `#10B981`                  | Idle status dot                                                       |
| `--ax-warning`        | `#F59E0B`              | `#F59E0B`                  | Busy status dot                                                       |
| `--ax-danger`         | `oklch(0.58 0.25 27)`  | `oklch(0.62 0.25 27)`      | Destructive button                                                    |

### Avatar hue palette (8 colors)

| Name       | Light fill | Light ring | Dark fill | Dark ring |
| ---------- | ---------- | ---------- | --------- | --------- |
| Lilac      | `#E8D5FF`  | `#C8A8FF`  | `#3A2F5C` | `#6B53B5` |
| Mint       | `#C2F0E2`  | `#6DCCAB`  | `#1F4538` | `#3E8869` |
| Peach      | `#FFD7C2`  | `#FF9B6C`  | `#4A2E22` | `#94583F` |
| Sky        | `#CFE8F3`  | `#6FC3DD`  | `#1D3848` | `#3A6B89` |
| Rose       | `#FFD2DC`  | `#FF8AA5`  | `#4A2832` | `#A24A63` |
| Honey      | `#FFE9B5`  | `#E8B948`  | `#4A3D1A` | `#A88A2E` |
| Periwinkle | `#D7E4FF`  | `#8AA8FF`  | `#252E48` | `#5A75B5` |
| Sage       | `#D5F3D1`  | `#6FC76F`  | `#1F3D1F` | `#3E783E` |

A pure-function `pickHue(seed: string): HueName` derives the hue from the employee ID/seed via a stable hash. Token names: `--ax-hue-{name}-fill` and `--ax-hue-{name}-ring`. Components read the resolved token via inline `style` since Tailwind can't dynamically interpolate the name.

### Radius scale (AgentX-scoped, not overriding the global shadcn `--radius`)

| Token              | Value   | Use                                               |
| ------------------ | ------- | ------------------------------------------------- |
| `--ax-radius-sm`   | `8px`   | Inline pills, badges, small icon containers       |
| `--ax-radius-md`   | `10px`  | Buttons, inputs, sub-card icon container          |
| `--ax-radius-lg`   | `14px`  | Sub-cards (employee, KPI, doc)                    |
| `--ax-radius-xl`   | `16px`  | Main column cards                                 |
| `--ax-radius-2xl`  | `20px`  | Drawer left edge, dialogs                         |
| `--ax-radius-full` | `999px` | Status dots, day separators, count chips, avatars |

### Shadow scale

```
--ax-shadow-card:  0 1px 2px rgba(20,20,30,.04), 0 6px 18px rgba(20,20,30,.05);  /* light */
--ax-shadow-card:  0 1px 2px rgba(0,0,0,.30),    0 6px 18px rgba(0,0,0,.25);     /* dark */
--ax-shadow-drawer: 0 0 0 1px rgba(0,0,0,.04), -16px 0 40px rgba(0,0,0,.08);     /* light */
--ax-shadow-drawer: 0 0 0 1px rgba(255,255,255,.04), -16px 0 40px rgba(0,0,0,.55); /* dark */
--ax-shadow-hover:  0 2px 4px rgba(0,0,0,.05),  0 10px 24px rgba(0,0,0,.07);     /* both: stronger but same shape */
```

No global border tokens for cards — the visual edge comes from shadow + canvas contrast. Borders are reserved for hover/focus rings and for low-prominence subdividers inside cards.

---

## 2. Layout

Outer container changes from edge-to-edge grid with `border-r` / `border-l` dividers to a **floating-cards-on-canvas** layout:

```
┌──────────────────────────────────────── ax-canvas ────────────────────────────────────────┐
│  ┌──────────────┐  ┌────────────────────────────────┐  ┌──────────────┐                  │
│  │              │  │                                │  │              │                  │
│  │ Conversation │  │           Main page            │  │   Members    │   <- ax-surface  │
│  │     list     │  │   (chat / workforce / kb /     │  │   (chat      │      cards       │
│  │              │  │       dashboard)               │  │   only)      │                  │
│  │              │  │                                │  │              │                  │
│  └──────────────┘  └────────────────────────────────┘  └──────────────┘                  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

**Sizing**

- Outer canvas padding: `10px` (windowed) / `12px` (macOS fullscreen — derive from `useIsFullscreen`)
- Inter-column gap: `10px`
- Column widths: `260px / 1fr / 260px` (unchanged)
- Each card is `border-radius: var(--ax-radius-xl)` with `box-shadow: var(--ax-shadow-card)`
- No borders on the cards. Hover/focus uses an inset 1px ring in `--ax-primary-soft`.

**Member column visibility** stays conditional on `activePage === 'chat' && activeConv != null`. Mount/unmount animates: width `0 → 260px` plus `opacity 0 → 1` over `180ms ease-out`.

**Scrolling** stays per-card. The outer canvas does not scroll. Each card's header is sticky inside its own scroll container.

---

## 3. Conversation list (left column)

Changes inside the single card; the IA from the recent refactor (config nav embedded under the conversation list, no separate left sidebar) is preserved.

**Header** (52px sticky)

- Left: title "Groups" + count chip (`--ax-primary-soft` background, `--ax-radius-full`)
- Right: solid primary-filled `+` button, 30×30, `--ax-radius-md` — replaces the current ghost icon button to give the CTA real prominence
- Bottom divider: 1px `--ax-border`

**Search** (below header, padding `10px 14px`)

- Input height 34, `--ax-radius-md`, background `--ax-canvas` when unfocused; on focus → `--ax-surface` background plus 3px ring in `--ax-primary-soft`
- Inline search icon at left

**List item**

- Padding `10px`, gap `10px`, `--ax-radius-md` container
- Avatar 40×40 circular, filled with the conversation's stable hue (derived from conversation ID hash), inset 1.5px ring at the matching `-ring` color
- Right of avatar: title row (`13.5px / 600`) + smart-time stamp (10px muted); preview row (12px) below
- Active state: background `--ax-primary-faint` (~6% opacity primary), no border
- Hover: subtle background shift (`--ax-canvas`)
- Right-click `ContextMenu` (Delete) preserved as-is, only the menu container picks up the new radius/padding

**Config nav** (replaces the current vertical button stack)

- Single row segmented pill at the bottom of the card, above the back-to-chat row
- Active item: full-width-share of the pill, shows icon + label, background `--ax-primary-soft`
- Inactive items: square icon-only buttons, 36×36, `--ax-radius-md`
- Clicking an inactive item promotes it (expands to icon+label, demotes the previous active to icon-only). Spring 200ms.
- This recovers two rows of vertical space versus today's three vertically-stacked buttons.

**Back to chat row**

- Plain row at bottom, 36px high, label only, muted — preserved from current

**Empty / no-results states**

- "No groups yet" and "No groups match …" use the shared empty-state component (see §10).

---

## 4. Chat main area (middle column)

### Chat header (56px sticky inside chat card)

- Left cluster: **stacked avatars** (up to 3 actual member avatars, then a `+N` filled-grey chip), each with white `box-shadow: 0 0 0 2px var(--ax-surface)` to create the overlap-with-gap effect
- Title (`15px / 600`) and a secondary line "5 members · Team Name" (`11.5px muted`)
- Right: an overflow `⋯` button (`--ax-radius-md`, `--ax-canvas` background) that hosts secondary actions
- Editable title behavior is preserved (click → inline input). The inline input adopts the new input styling (`--ax-surface-sunken` background, `--ax-radius-md`, primary-soft focus ring).

### Messages area

Layout: vertical flow, 18px padding, 14px gap between bubbles. New message enter animation per §8.

**Day separator**

- Centered pill, 11px label, `--ax-canvas` background, `--ax-radius-full`. Text via `formatDayLabel` (existing).

**System bubble**

- Same pill style as day separator. Centered.

**Employee bubble** (left side)

- Row layout: 36×36 avatar (Dicebear inside the hue ring) + body
- Header line: name + middot + time, 11.5px muted
- Body: rounded-corner asymmetric bubble — `border-radius: 6px var(--ax-radius-xl) var(--ax-radius-xl) var(--ax-radius-xl)` to indicate it grows out of the avatar side
- Bubble background: `--ax-canvas`, padding `10px 14px`, text 14px line-height 1.55
- Markdown rendering inside is unchanged

**PM bubble**

- Same layout as employee, but the avatar is a 36×36 circle filled with `--ax-primary`, white "PM" text, with a double-ring: 2px `--ax-surface` outer + 1px `--ax-primary-soft` inside the outer
- Bubble body same as employee

**User bubble** (right side, `flex-row-reverse`)

- Avatar 36×36, `--ax-primary-soft` background, primary-dark "You" text
- Bubble background: `--ax-primary` filled, white text
- Asymmetric radius reversed: `var(--ax-radius-xl) 6px var(--ax-radius-xl) var(--ax-radius-xl)`
- Header line aligned right

**Tool card** (replaces inline tool badge inside employee bubble)

- Sits in the same slot as an employee bubble body
- White `--ax-surface` background, 1px `--ax-border`, `--ax-radius-lg` asymmetric (same as employee bubble)
- Left cluster: 24×24 icon container in `--ax-primary-soft`, primary-dark wrench/tool icon
- Center: tool name (12.5px / 600) + truncated input args (11px muted)
- Right: phase indicator — `running` → 14×14 spinner with primary top stroke; `end` → check icon in `--ax-primary`
- Phase transition uses motion crossfade (§8)

### Composer (bottom of chat card, not floating)

- Wrapped in a band with `--ax-surface-sunken` background, top divider, padding `12px 16px 14px`
- Inner input region: `--ax-surface` background, 1px `--ax-border`, `--ax-radius-xl`, padding `8px 8px 8px 14px`
- Textarea: `min-h 36, max-h 192`, no border, transparent background, font 14
- Focus: input region's border becomes `--ax-primary`, plus 3px outer ring in `--ax-primary-soft`. Transition 140ms.
- Right-aligned action row inside the input region:
  - Attachment button: 34×34, `--ax-radius-md`, `--ax-canvas` background, paperclip icon (placeholder for future attachment work — not wired now, ships as decorative button that opens a "Coming soon" toast, OR omitted entirely if we want to ship lean — see open question §11)
  - Send button: 34×34, `--ax-radius-md`, `--ax-primary` filled, white send icon; disabled state: `--ax-canvas` background, muted icon, cursor not-allowed
- Hint line under the input region: 10.5px muted with `Enter` / `Shift+Enter` kbd chips on `--ax-canvas` background

---

## 5. Members panel (right column)

### Header (52px sticky)

- Left: "Members" title + count chip
- Right: a compact status summary — two dot-pills like `● 3 idle  ● 2 busy` in 10.5px muted text, dots in `--ax-success` / `--ax-warning`

### Body — grouped by team

Replaces today's flat list. Members are partitioned by `teamId`. Order:

1. **Coordinators** (synthetic group with one row: the `PM`. Always shown for any conversation that has a PM. Real agents never live here — they're regular employees grouped under their own team.)
2. Each real team in alphabetical-by-name order
3. **Unassigned** (only if any member has no team)

Each group:

- Group label row: 10.5px uppercase muted, letter-spacing 0.08em, prefixed with the team's icon. Format: `{icon} {team name} · {count}`
- Member rows below

Member row:

- Padding `8px`, gap `10px`, `--ax-radius-md`
- Background: `--ax-surface-sunken` when the member is busy; transparent otherwise
- Avatar 36×36 in its assigned hue ring (Dicebear inside). For PM: primary-filled circle with PM text and primary-darker inset ring
- **Status dot** absolutely positioned at avatar bottom-right, 11×11, with a 2px ring matching the row's background (transparent → `--ax-surface`, busy → `--ax-surface-sunken`) so it looks embedded in the avatar regardless of busy state
- Right of avatar: name (13.5px) + secondary line
  - Idle: `{team name} · idle` (12.5px muted)
  - Busy: current action text (e.g., `running web_search…`) in `--ax-warning` color
- Busy dot animation: opacity `0.5 ↔ 1` loop 1.6s

### Empty state

Three stacked colorful avatar circles + "The PM will recruit teammates as needed." (uses shared empty-state component).

---

## 6. Workforce page

### Page header (56px sticky inside the main card)

- Title block: "Workforce" + summary line "{N} employees · {M} teams"
- Right action cluster (right-aligned, 6px gap between buttons):
  - `+ Team` — secondary button, `--ax-canvas` background, `--ax-radius-md`
  - `+ Employee` — primary filled, `--ax-primary` background, white text
- These two replace the current ambiguous mix of plus-icon affordances and provide a clear primary CTA. (A `Sort` control was considered but cut from this redesign — adding a new feature is out of scope.)

### Team section

- Header: chevron (rotates 90° when expanded), team icon in a 32×32 `--ax-radius-md` container filled with the team's hue-soft color, team name (15px / 600), count chip, optional description (12px muted, truncated)
- Right-click `ContextMenu` preserved (Edit team / Add employee here / Delete team)

### Employee card

- Card: `--ax-surface-sunken` background, `--ax-radius-lg`, padding `14px`, gap `12px`, flex row
- Avatar 44×44 in assigned hue ring (Dicebear inside)
- Body:
  - Name (13.5px / 600)
  - Description (11.5px muted, two-line max)
  - **Bottom chip row**: model name chip in `--ax-primary-soft` + up to two tool/skill chips in `--ax-canvas` background. Chips are `--ax-radius-sm`, 10px text, 2px 6px padding. Overflow becomes `+N more` chip.
- Hover: shadow rises to `--ax-shadow-hover`, `translateY(-1px)`, 140ms
- Right-click `ContextMenu` preserved (Edit / Delete)

### Add-employee placeholder card

Last item in each team's grid, sized like an employee card:

- `--ax-radius-lg`, 1.5px dashed `--ax-border`
- Centered "`+ Add employee`" text, muted
- Hover: dashed border becomes solid `--ax-primary`, text becomes `--ax-primary`
- Click → calls `openNewEmployee(team.id)` exactly like the current Add button

### Unassigned section

- Only visible if there's at least one unassigned employee
- Defaults to collapsed
- Header uses a neutral grey (`--ax-canvas`) icon container instead of a hue color, and the label is muted

---

## 7. Knowledge Base page

### Header (56px sticky)

- Title block: "Knowledge Base" + "{N} documents · {tokens}" summary
- Right: primary filled `+ Document` button (matches Workforce's `+ Employee`)

### Body layout

`grid-cols-[1fr_320px]` with `14px` gap, padding `18px` (unchanged structure).

### Document list (left)

Each doc is a sub-card:

- `--ax-surface-sunken` background, `--ax-radius-lg`, padding `14px`, gap `12px`
- Left: file-type icon container 36×36, `--ax-radius-md`, hue-filled background based on file kind (Markdown=Lilac, PDF=Peach, Text=Sky, JSON=Honey, default=Sage)
- Right: title (13.5px / 600) + time stamp top-right (10.5px muted) + 2-line content preview (12px muted)
- Hover: same as employee card
- Trash button: hover-revealed `--ax-radius-sm` ghost button in the top right corner, replacing the current always-visible one

### New-document editor (right, 320px)

- Sub-card with `--ax-surface-sunken` background
- "NEW DOCUMENT" uppercase 11px label
- Title input: `--ax-surface` background, `--ax-border`, `--ax-radius-md`, padding `8px 12px`
- Body textarea: same surface treatment, `min-h 140`, `--ax-radius-md`
- Primary submit button full-width: "+ Add document", disabled when fields empty

---

## 8. Dashboard / Cost Analysis page

### Page header

- Title "Dashboard" + secondary line "Last {period}"
- Right: **segmented control** with three options (`7d / 30d / All`)
  - `--ax-canvas` outer container, `--ax-radius-md`, padding 3px
  - Active option: `--ax-surface` background + shadow `0 1px 2px rgba(0,0,0,.04)`, `--ax-radius-sm`
  - Inactive options: transparent, muted text
  - Selecting animates the active block sliding (spring 200ms)

### KPI grid (4 columns)

Each card:

- `--ax-surface-sunken`, `--ax-radius-lg`, padding `14px`
- Top row: small muted label (11.5px) + 28×28 icon container in a fixed hue (Primary / Lilac / Sky / Peach in order to create deliberate color rhythm)
- Big number (22px / 700)
- Tiny secondary line: either a trend indicator (`↗ 12.4%` in `--ax-success`, `↘ X%` in `--ax-danger`) or a breakdown (`6 active · 2 idle`)

### Chart card

- `--ax-surface-sunken`, `--ax-radius-lg`, padding `16px`
- Header line: title + legend dots
- Recharts:
  - Single-series area: `stroke=var(--ax-primary)`, fill via a linearGradient from `var(--ax-primary)` at 0.4 opacity down to 0
  - Multi-series (per agent or per day): colors picked from the 8 hue ring colors in order, allowing wraparound. Implement via a `chartHueOrder` constant.
  - Grid: very faint `--ax-border`
  - Tooltip: `--ax-surface` card, `--ax-shadow-card`, `--ax-radius-md`, 12px text

### "Cost by Employee" table

- Rows are sub-cards with `--ax-surface-sunken` and `--ax-radius-lg`, separated by 4px gap rather than the current row-line table
- Each row: small hue-ringed avatar + name + right-aligned cost (`tabular-nums`)
- Sort indicator preserved as today

---

## 9. Editors (right-side drawers) — Employee + Team

### Drawer container

- Width 520px
- Slides in from right edge
- Background: `--ax-surface`
- Left edge corners rounded: `border-radius: var(--ax-radius-2xl) 0 0 var(--ax-radius-2xl)`
- Shadow: `--ax-shadow-drawer`
- Backdrop: a translucent overlay derived from canvas hue at 60% alpha in light, and a translucent `#000` at 60% in dark — softer than the current default dialog black

### Drawer header (58px, sticky)

- Left: tiny uppercase context label ("EMPLOYEE" / "TEAM") + name (15px / 600)
- Right: action cluster
  - **Cancel** button (`--ax-canvas` background, `--ax-radius-md`)
  - **Save** button (`--ax-primary` filled, white text). Disabled state: muted background, muted text.
- These move from the bottom (where they live today on some sheets) into the header so they remain reachable when the body scrolls — long forms (system prompt, skills, MCP servers) need this.

### Drawer body

- Padding `20px`, scrollable
- Form fields use a consistent rhythm:
  - Uppercase muted 11px label
  - 4px gap
  - Input: `--ax-surface-sunken` background, 1px `--ax-border`, `--ax-radius-md`, padding `9px 12px`, text 13.5px
- Avatar row at top: 64×64 avatar in its assigned hue ring (Dicebear inside) + a small 24×24 white floating button at bottom-right with a pencil icon, triggers the AvatarPicker popover
- Two-up rows for `Team` + `Model` selects (grid-cols-2 gap-12px)
- Long-form fields (system prompt) get `min-h 90` and `line-height 1.55`

### AvatarPicker (popover)

- Popover anchored to the pencil button, opens upward when there's room
- Two sections inside:
  1. **Hue** — 8 color circles in a single row, current one shown with a primary check mark
  2. **Style** — grid of Dicebear style thumbnails (each rendered with a stable preview seed), current one boxed with `--ax-primary` ring
- Footer: "Randomize" button (primary ghost) — fills both with random picks

---

## 10. Empty state & AlertDialog

### Empty state component

A single shared component `<AgentXEmptyState>` with props `{ avatars, title, description, action }`. Used everywhere a content area has nothing in it.

- Card padding `48px 24px`, centered text
- `avatars` is an array of `{ hue, content }` rendered as 3 overlapping circles with a slight rotation (`-8deg / 0 / +8deg`), the middle one slightly larger (56) than the outer two (48)
- Title 15px / 600
- Description 12.5px muted, max-width `280px`, centered
- Action is an optional single button (always primary filled, never multiple)

Usage:

- Chat (no group selected): three colored circles + "No group selected" + "Create a group"
- Workforce empty team / no employees: single circle with a `+` glyph + "No employees yet" + "Add an employee"
- Knowledge: doc icons in three hues + "No documents yet" + "Add document"
- Members empty: three colored circles + "The PM will recruit teammates as needed." + no action

### AlertDialog

- Container: `--ax-surface`, `--ax-radius-2xl`, `--ax-shadow-card`
- Backdrop: translucent overlay derived from canvas at 60% alpha (not pure black)
- Title 15px / 600, description 13px muted
- The deleted object's name is rendered as a monospace chip with `--ax-canvas` background + `--ax-radius-sm` to prevent long titles from breaking the layout
- Footer buttons:
  - Cancel: `--ax-canvas`, `--ax-radius-md`
  - Delete: `--ax-danger` filled, white text, `--ax-radius-md` — replacing the current red-text-on-outline destructive variant for a clearer destructive affordance

---

## 11. Motion system

Single source of truth in `motion-tokens.ts` (or similar) under `components/agent-x/`:

```ts
export const ax = {
  fast: '120ms',
  base: '160ms',
  drawer: '220ms',
  spring: 'cubic-bezier(.22,1,.36,1)',
  easeOut: 'cubic-bezier(.16,1,.3,1)'
}
```

| Trigger                      | Effect                                    | Duration / curve |
| ---------------------------- | ----------------------------------------- | ---------------- |
| Members column mount/unmount | width + opacity                           | `180ms ease-out` |
| Conversation row click       | bg fade + 0.96→1 scale                    | `120ms`          |
| Config segmented pill switch | active block slides + label fades in      | `200ms spring`   |
| New message enters           | y+8 → 0, opacity 0→1                      | `160ms ease-out` |
| Composer focus               | border-color + ring                       | `140ms`          |
| Tool card phase change       | crossfade spinner ↔ check                 | `200ms`          |
| Drawer in/out                | x +40 → 0, opacity 0→1                    | `220ms spring`   |
| Employee/Doc card hover      | shadow + y -1px                           | `140ms`          |
| Busy dot                     | opacity 0.5↔1                             | `1.6s loop`      |
| Avatar hover (header stack)  | y -2px on the hovered avatar, others stay | `140ms`          |

All wrapped in a top-level `@media (prefers-reduced-motion: reduce)` block that sets every transition/animation duration to `0.01ms`, effectively disabling motion while preserving final states.

---

## 12. Dark mode

The same components render correctly in dark by virtue of the token system. Specific decisions:

- Canvas is `#15171C` (cool deep grey, not pure black) so cards have somewhere to "float against"
- Surface is `#1D2027`, sunken `#23262E` — three-step depth without relying on shadow (which is muted in dark mode)
- Avatar hue tokens use the dark column from §1 — same hue, lowered lightness (~0.30 fill, ~0.55 ring)
- Primary is bumped slightly (`oklch 0.55` vs `0.52`) to maintain contrast on dark surfaces
- Drawer shadow uses a stronger black glow because shadow alone reads weaker in dark mode

---

## 13. File / component touchpoints

| File                                                                | Change                                                                                       |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/renderer/assets/stylesheets/globals.css`                       | Add `--ax-*` token block in `:root` and `.dark`                                              |
| `src/renderer/components/agent-x/lib/hue.ts` _(new)_                | `pickHue(seed)`, `ax.motion` tokens, hue→token helpers                                       |
| `src/renderer/containers/agent-x.tsx`                               | Replace grid with canvas + 3 floating cards + members mount transition                       |
| `src/renderer/components/agent-x/chat/conversation-list.tsx`        | New header / search / item / config segmented nav / back row                                 |
| `src/renderer/components/agent-x/chat/group-chat.tsx`               | Header with stacked avatars + overflow menu                                                  |
| `src/renderer/components/agent-x/chat/group-message-bubble.tsx`     | Asymmetric bubble shapes, PM/You avatar styles, hue avatars                                  |
| `src/renderer/components/agent-x/chat/composer.tsx`                 | New band + input region + send/attach action cluster                                         |
| `src/renderer/components/agent-x/chat/group-members-panel.tsx`      | Team grouping, status summary, embedded status dots, PM coordinators group                   |
| `src/renderer/components/agent-x/workforce/workforce-page.tsx`      | Page header with 3-button cluster, hue team icons, employee card chips, add-placeholder card |
| `src/renderer/components/agent-x/employees/employee-editor.tsx`     | Drawer layout with sticky header actions, uppercase labels                                   |
| `src/renderer/components/agent-x/teams/team-editor.tsx`             | Same drawer treatment                                                                        |
| `src/renderer/components/agent-x/employees/employee-avatar.tsx`     | Render Dicebear inside a hue-ringed wrapper; accept optional hue override                    |
| `src/renderer/components/agent-x/employees/avatar-picker.tsx`       | Add hue row, restyle thumbnails                                                              |
| `src/renderer/components/agent-x/knowledge/knowledge-base-page.tsx` | New header, doc cards with file-type hue, editor card                                        |
| `src/renderer/components/agent-x/cost-analysis.tsx`                 | Segmented period control, KPI grid, chart palette using hue order                            |
| `src/renderer/components/agent-x/empty-state.tsx` _(new)_           | Shared `<AgentXEmptyState>`                                                                  |
| `src/renderer/components/agent-x/lib/motion.ts` _(new)_             | Motion tokens + reduced-motion helper                                                        |

`AgentXLayout` (`src/renderer/layouts/agent-x-layout/index.tsx`) is unchanged — the canvas styling lives inside `AgentXContainer`.

---

## 14. Open question (single, deferred)

**Attachment button in the Composer**: ships with this redesign as a visual slot (paperclip icon), but actual file-attachment behavior is not in scope. Options at implementation time:

1. Render the slot and wire it to a "Coming soon" toast (placeholder)
2. Omit the slot entirely and revisit when attachments are built

Default to **option 2 (omit)** to keep the design honest — we won't ship affordances that don't work. Document choice in the implementation plan.

---

## 15. Out of scope

- Multi-column user-arranged dashboard (Perch-style)
- Replacing Dicebear avatars
- Restructuring AgentX information architecture
- Modifying Exodus surfaces outside AgentX
- New product capabilities
- Attachment flow (see §14)
