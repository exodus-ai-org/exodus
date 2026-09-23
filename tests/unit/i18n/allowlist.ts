/**
 * Permanent exceptions to the hardcoded-string guard
 * (`no-hardcoded-strings.test.ts`). Every entry is a genuine proper noun,
 * brand name, or technical identifier that must never be translated —
 * this is not a place to park deferred i18n debt. `file` is repo-relative;
 * `text` must match the flagged string exactly.
 */
export interface AllowlistEntry {
  file: string
  text: string
  /** The line the guard's scanner reports for this violation today. Pinning
   *  this (rather than matching on `file`+`text` alone) keeps the allowlist
   *  from silently exempting some unrelated future occurrence of the same
   *  short string elsewhere in the same file (e.g. "MIT" also appearing in
   *  a new sentence) — the staleness test re-scans the file and fails if a
   *  violation no longer exists at exactly this file/line/text triple. */
  line: number
  reason: string
}

export const ALLOWLIST: AllowlistEntry[] = [
  {
    file: 'src/renderer/components/calling-tools/artifact/artifact-card.tsx',
    text: 'artifact://',
    line: 132,
    reason: "The app's own URI scheme prefix, not user-facing prose."
  },
  {
    file: 'src/renderer/components/calling-tools/drawio/drawio-card.tsx',
    text: 'draw.io ·',
    line: 138,
    reason: "draw.io is the third-party product's own brand name."
  },
  {
    file: 'src/renderer/components/settings/settings-form/logger.tsx',
    text: 'traceId:',
    line: 417,
    reason: 'Debug-only technical field label in the raw log inspector.'
  },
  {
    file: 'src/renderer/components/settings/settings-form/logger.tsx',
    text: 'originTraceId:',
    line: 419,
    reason: 'Debug-only technical field label in the raw log inspector.'
  },
  {
    file: 'src/renderer/components/settings/settings-form/system-info.tsx',
    text: 'exodus-ai-org/exodus',
    line: 98,
    reason: 'GitHub org/repo slug, a proper noun.'
  },
  {
    file: 'src/renderer/components/settings/settings-form/system-info.tsx',
    text: '@YanceyOfficial',
    line: 101,
    reason: 'Social handle, a proper noun.'
  },
  {
    file: 'src/renderer/components/settings/settings-form/system-info.tsx',
    text: 'exodus.yancey.app',
    line: 104,
    reason: 'Website domain, a proper noun.'
  },
  {
    file: 'src/renderer/components/settings/settings-form/system-info.tsx',
    text: 'MIT',
    line: 107,
    reason: 'Software license name — never translated.'
  }
]
