import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import type { InstalledSkill } from '@exodus/shared/types/skills'
import { getHttpErrorMessage, toErrorI18n } from '@exodus/shared/utils/http'
import { PackageOpenIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sileo } from 'sileo'
import useSWR from 'swr'

import { SettingsEmpty, SettingsItem } from '@/components/settings/settings-kit'
import { SettingsSection } from '@/components/settings/settings-row'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useFormat } from '@/lib/format'
import {
  INSTALLED_SKILLS_KEY,
  toggleSkill,
  uninstallSkill
} from '@/services/skills'

import { Skeletons } from './leaderboard'
import { refFromInstalled, type SkillRef } from './types'
import { UninstallDialog } from './uninstall-dialog'

export function InstalledSkillsList({
  onOpen
}: {
  onOpen: (ref: SkillRef) => void
}) {
  const { t, i18n } = useTranslation('settings')
  const { dateTime } = useFormat()
  const { data, isLoading } = useSWR<InstalledSkill[]>(INSTALLED_SKILLS_KEY)
  const [pendingUninstall, setPendingUninstall] =
    useState<InstalledSkill | null>(null)

  const handleToggle = async (skill: InstalledSkill, isActive: boolean) => {
    try {
      await toggleSkill(skill.slug, isActive)
    } catch (err) {
      const description = getHttpErrorMessage(err, toErrorI18n(i18n))
      sileo.error({ title: t('skillsMarket.toast.updateFailed'), description })
    }
  }

  const handleUninstall = async (skill: InstalledSkill) => {
    setPendingUninstall(null)
    try {
      await uninstallSkill(skill.slug)
      sileo.success({
        title: t('skillsMarket.toast.uninstalledTitle', {
          name: skill.displayName
        })
      })
    } catch (err) {
      const description = getHttpErrorMessage(err, toErrorI18n(i18n))
      sileo.error({
        title: t('skillsMarket.toast.uninstallFailed'),
        description
      })
    }
  }

  if (isLoading || !data) return <Skeletons count={2} />

  if (data.length === 0) {
    return (
      <SettingsSection>
        <SettingsEmpty
          icon={PackageOpenIcon}
          title={t('skillsMarket.installedTab.empty')}
          description={t('skillsMarket.installedTab.emptyHint')}
        />
      </SettingsSection>
    )
  }

  return (
    <>
      <SettingsSection>
        {data.map((skill) => {
          const ref = refFromInstalled(skill)
          const name = ref ? (
            <button
              type="button"
              onClick={() => onOpen(ref)}
              className="truncate hover:underline"
            >
              {skill.displayName}
            </button>
          ) : (
            <span className="truncate">{skill.displayName}</span>
          )
          return (
            <SettingsItem
              key={skill.slug}
              title={
                <>
                  {name}
                  <Badge variant="outline" className="tabular-nums">
                    {skill.version}
                  </Badge>
                  {!skill.source && (
                    <Badge variant="secondary">
                      {t('skillsMarket.installedTab.legacy')}
                    </Badge>
                  )}
                  <span className="text-muted-foreground truncate text-xs font-normal">
                    {skill.registryId ?? skill.slug}
                    {' · '}
                    {t('skillsMarket.installedTab.installedAt', {
                      date: dateTime(new Date(skill.installedAt), {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                    })}
                  </span>
                </>
              }
              actions={
                <>
                  <Switch
                    data-testid={TEST_IDS.skillsMarket.activeSwitch}
                    checked={skill.isActive}
                    onCheckedChange={(checked) => handleToggle(skill, checked)}
                    aria-label={t('skillsMarket.detail.active')}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    data-testid={TEST_IDS.skillsMarket.uninstallButton}
                    aria-label={t('skillsMarket.detail.uninstall')}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setPendingUninstall(skill)}
                  >
                    <Trash2Icon />
                  </Button>
                </>
              }
            />
          )
        })}
      </SettingsSection>
      <UninstallDialog
        skill={pendingUninstall}
        onOpenChange={(open) => {
          if (!open) setPendingUninstall(null)
        }}
        onConfirm={handleUninstall}
      />
    </>
  )
}
