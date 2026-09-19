import { EXODUS_CLI_REPO } from '@exodus/shared/constants/external-urls'
import { Trans } from 'react-i18next'

/**
 * Named `components` (not positional children) so a formatter reflow can't
 * renumber the placeholders; `tests/unit/i18n/settings-namespace.test.ts`
 * renders this exact component and asserts the markup.
 */
export function CliNotice() {
  return (
    <p className="text-muted-foreground text-xs leading-relaxed">
      <Trans
        ns="settings"
        i18nKey="skillsMarket.cli.notice"
        components={{
          cli: (
            <a
              href={EXODUS_CLI_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2"
            />
          ),
          code: <code />
        }}
      />
    </p>
  )
}
