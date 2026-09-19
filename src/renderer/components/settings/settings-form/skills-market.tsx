import { useTranslation } from 'react-i18next'

import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty'

/**
 * Placeholder: skills is deprecated (see docs/migration-plan.md, Phase 3
 * third pass). The marketplace UI was not migrated — a replacement is planned
 * — so this only keeps the settings nav entry, as the place to plug it in.
 */
export function SkillsMarketSetting() {
  const { t } = useTranslation('settings')

  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{t('skillsMarket.installedTab.empty')}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}
