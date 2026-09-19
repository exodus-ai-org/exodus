import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import type { InstalledSkill } from '@exodus/shared/types/skills'
import { getHttpErrorMessage, toErrorI18n } from '@exodus/shared/utils/http'
import { PackageOpenIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sileo } from 'sileo'
import useSWR from 'swr'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty'
import { Switch } from '@/components/ui/switch'
import { useFormat } from '@/lib/format'
import {
  INSTALLED_SKILLS_KEY,
  toggleSkill,
  uninstallSkill
} from '@/services/skills'

import { SectionLabel } from './section-label'
import { SkillRowSkeleton } from './skill-row'
import { refFromInstalled, type SkillRef } from './types'
import { UninstallDialog } from './uninstall-dialog'

const GRID = 'grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4'

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

  if (isLoading || !data) {
    return (
      <div className="divide-border divide-y">
        <SkillRowSkeleton />
        <SkillRowSkeleton />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageOpenIcon />
          </EmptyMedia>
          <EmptyTitle>{t('skillsMarket.installedTab.empty')}</EmptyTitle>
          <EmptyDescription>
            {t('skillsMarket.installedTab.emptyHint')}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      <div className="divide-border flex flex-col divide-y">
        <div className={`${GRID} pb-2`}>
          <SectionLabel>{t('skillsMarket.leaderboard.skill')}</SectionLabel>
          <SectionLabel>{t('skillsMarket.detail.active')}</SectionLabel>
          <span aria-hidden className="w-7" />
        </div>
        {data.map((skill) => {
          const ref = refFromInstalled(skill)
          return (
            <div key={skill.slug} className={`${GRID} py-3`}>
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex min-w-0 flex-wrap items-baseline gap-2">
                  {ref ? (
                    <button
                      type="button"
                      onClick={() => onOpen(ref)}
                      className="truncate text-sm font-semibold hover:underline"
                    >
                      {skill.displayName}
                    </button>
                  ) : (
                    <span className="truncate text-sm font-semibold">
                      {skill.displayName}
                    </span>
                  )}
                  <span className="text-muted-foreground truncate font-mono text-xs">
                    {skill.registryId ?? skill.slug}
                  </span>
                  <Badge variant="outline" className="h-4 px-1.5 font-mono">
                    {skill.version}
                  </Badge>
                  {!skill.source && (
                    <Badge variant="secondary" className="h-4 px-1.5">
                      {t('skillsMarket.installedTab.legacy')}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground font-mono text-xs">
                  {t('skillsMarket.installedTab.installedAt', {
                    date: dateTime(new Date(skill.installedAt), {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                  })}
                </p>
              </div>
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
            </div>
          )
        })}
      </div>
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
