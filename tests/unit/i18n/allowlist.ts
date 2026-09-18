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
  reason: string
}

export const ALLOWLIST: AllowlistEntry[] = [
  {
    file: 'src/renderer/components/calling-tools/artifact/artifact-card.tsx',
    text: 'artifact://',
    reason: "The app's own URI scheme prefix, not user-facing prose."
  },
  {
    file: 'src/renderer/components/calling-tools/drawio/drawio-card.tsx',
    text: 'draw.io ·',
    reason: "draw.io is the third-party product's own brand name."
  },
  {
    file: 'src/renderer/components/settings/settings-form/logger.tsx',
    text: 'traceId:',
    reason: 'Debug-only technical field label in the raw log inspector.'
  },
  {
    file: 'src/renderer/components/settings/settings-form/logger.tsx',
    text: 'originTraceId:',
    reason: 'Debug-only technical field label in the raw log inspector.'
  },
  {
    file: 'src/renderer/components/settings/settings-form/system-info.tsx',
    text: 'exodus-ai-org/exodus',
    reason: 'GitHub org/repo slug, a proper noun.'
  },
  {
    file: 'src/renderer/components/settings/settings-form/system-info.tsx',
    text: '@YanceyOfficial',
    reason: 'Social handle, a proper noun.'
  },
  {
    file: 'src/renderer/components/settings/settings-form/system-info.tsx',
    text: 'exodus.yancey.app',
    reason: 'Website domain, a proper noun.'
  },
  {
    file: 'src/renderer/components/settings/settings-form/system-info.tsx',
    text: 'MIT',
    reason: 'Software license name — never translated.'
  }
]
