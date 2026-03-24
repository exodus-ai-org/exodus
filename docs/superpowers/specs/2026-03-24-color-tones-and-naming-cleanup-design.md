# Color Tone Presets + Naming Cleanup

**Date**: 2026-03-24

---

## 1. Color Tone Selection (Settings → General)

### Overview

Add a "Color Tone" picker to the General settings page. Six presets that shift the OKLCH hue channel across all CSS variables — background, card, border, primary, sidebar, etc. — for full global tinting in both light and dark modes.

### Presets

| Name    | Hue | Description             |
| ------- | --- | ----------------------- |
| Emerald | 160 | Current default (green) |
| Blue    | 230 | Classic blue            |
| Violet  | 285 | Purple                  |
| Rose    | 350 | Warm pink               |
| Orange  | 55  | Warm amber              |
| Neutral | —   | Pure gray, chroma → 0   |

### Implementation

**Storage**: Add `colorTone` field to the `settings` table (text column, default `'emerald'`). Add corresponding field to `SettingsSchema` as `z.enum(['emerald', 'blue', 'violet', 'rose', 'orange', 'neutral']).default('emerald')`.

**CSS Strategy**: Use a data attribute on `<html>` (e.g., `data-tone="blue"`) to select the active tone. Define each tone as a CSS ruleset:

```css
:root,
[data-tone='emerald'] {
  /* current values, hue ~160 */
}
[data-tone='blue'] {
  /* hue ~230 */
}
[data-tone='violet'] {
  /* hue ~285 */
}
/* ... */
```

Dark mode variants use `.dark[data-tone="blue"]` selectors.

**Tone Provider**: Create a `ToneProvider` (similar pattern to `ThemeProvider`) that:

1. Reads `colorTone` from the settings form / SWR data
2. Sets `data-tone` attribute on `document.documentElement`
3. Exposes `tone` and `setTone` via React context

Alternatively, integrate into the existing `ThemeProvider` to avoid a second provider. Since the tone is persisted server-side (in the settings table) unlike theme (localStorage), a separate thin provider or a hook is cleaner.

**UI**: In `generals.tsx`, add a `SettingRow` with label "Color Tone" below the Theme row. Display the 6 options as colored circle buttons (swatch picker style) — each circle filled with the preset's primary color. The active tone gets a ring indicator. On click, update the form field and the `data-tone` attribute.

**CSS Variable Generation**: For each tone, compute all ~30 CSS variables by substituting the hue value. The chroma and lightness values stay the same as the current emerald theme; only the hue channel changes. For "Neutral", set chroma to 0 across all variables.

### Color Values Per Tone

Each tone replaces the hue in OKLCH. The current emerald values serve as the template:

- **Primary (light)**: `oklch(0.52 0.17 H)` — strong accent
- **Primary (dark)**: `oklch(0.72 0.19 H)` — bright accent
- **Background (light)**: `oklch(0.985 0.004 H)` — subtle tint
- **Background (dark)**: `oklch(0.13 0.02 H+5)` — deep tint
- **Border (light)**: `oklch(0.905 0.012 H-5)` — muted edge
- And so on for all variables...

For Neutral: all chroma values become 0, hues become irrelevant.

---

## 2. "Setting" → "Settings" Rename

### Scope

Rename all occurrences of singular "Setting" to plural "Settings" across the full stack:

**Database**:

- Table: `setting` → `settings` (requires migration)
- Type: `Setting` → `Settings`

**Backend**:

- Route file: `routes/setting.ts` → `routes/settings.ts`
- Route path: `/api/setting` → `/api/settings`
- Schema file: `schemas/setting.ts` → `schemas/settings.ts`
- Query functions: `getSetting()` → `getSettings()`, `updateSetting()` → `updateSettings()`

**Shared**:

- Schema file: `schemas/setting-schema.ts` → `schemas/settings-schema.ts`
- Types: `SettingSchema` → `SettingsSchema`, `SettingInput` → `SettingsInput`, `Setting` → `Settings`

**Frontend**:

- Service: `services/setting.ts` → `services/settings.ts`
- Hook: `hooks/use-setting.ts` → `hooks/use-settings.ts`, `useSetting()` → `useSettings()`
- Store: `stores/setting.ts` → `stores/settings.ts`
- Component directory: `components/setting/` → `components/settings/`
- All imports updated accordingly

### Migration Strategy

Generate a Drizzle migration that renames the table. All internal references (column names, foreign keys) remain unchanged since `setting` has no foreign key dependents.

---

## 3. Database Column Naming Standardization

### Convention

- **Table names**: snake_case (already correct for most tables)
- **Column names**: camelCase (need to fix snake_case columns in newer tables)

### Columns to Rename

**`settings` table** (after rename):

- `created_at` → `createdAt`
- `updated_at` → `updatedAt`

**`memory` table**:

- `user_id` → `userId`
- `created_at` → `createdAt`
- `updated_at` → `updatedAt`
- `last_used_at` → `lastUsedAt`
- `is_active` → `isActive`

**`session_summary` table**:

- `session_id` → `sessionId`
- `user_id` → `userId`
- `updated_at` → `updatedAt`

**`memory_usage_log` table**:

- `memory_id` → `memoryId`
- `session_id` → `sessionId`
- `created_at` → `createdAt`

**`lcm_summary` table**:

- `chat_id` → `chatId`
- `token_count` → `tokenCount`
- `descendant_count` → `descendantCount`
- `earliest_at` → `earliestAt`
- `latest_at` → `latestAt`
- `created_at` → `createdAt`

**`lcm_summary_messages` table**:

- `summary_id` → `summaryId`
- `message_id` → `messageId`

**`lcm_summary_parents` table**:

- `child_id` → `childId`
- `parent_id` → `parentId`

**`lcm_context_items` table**:

- `chat_id` → `chatId`
- `token_count` → `tokenCount`
- `ref_id` → `refId`

### Migration Strategy

Generate a single Drizzle migration with `ALTER TABLE ... RENAME COLUMN` statements for all affected columns. Update the schema.ts file to use camelCase strings in the column definitions. Since Drizzle maps TS property names to DB column names via the string argument, we change the string from `'created_at'` to `'createdAt'`.

**Note**: The TypeScript property names in schema.ts already use camelCase (e.g., `createdAt: timestamp('created_at')`). After the rename, they become `createdAt: timestamp('createdAt')` — the string argument matches the property name, so some can be simplified to just `timestamp()` with no explicit name.

---

## Ordering

1. **Column rename migration** — foundation, no code changes beyond schema.ts
2. **Setting → Settings rename** — includes table rename migration + full-stack rename
3. **Color tone feature** — new feature built on top of the renamed settings infrastructure
