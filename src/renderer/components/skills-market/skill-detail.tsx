import {
  githubRepoUrl,
  skillsShSkill
} from '@exodus/shared/constants/external-urls'
import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import type {
  InstalledSkill,
  SkillAuditResponse,
  SkillDetail
} from '@exodus/shared/types/skills'
import { getHttpErrorMessage, toErrorI18n } from '@exodus/shared/utils/http'
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  DownloadIcon,
  ExternalLinkIcon,
  Loader2Icon,
  UnplugIcon
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sileo } from 'sileo'
import useSWR from 'swr'

import Markdown from '@/components/markdown'
import { SettingsEmpty, SwapLabel } from '@/components/settings/settings-kit'
import { SettingsSection } from '@/components/settings/settings-row'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  auditKey,
  cliInstallCommand,
  detailKey,
  INSTALLED_SKILLS_KEY,
  installSkill,
  toggleSkill,
  uninstallSkill
} from '@/services/skills'

import { AuditPanel } from './audit-panel'
import { CommandLine } from './command-line'
import { Installs } from './skill-row'
import { slugOf, type SkillRef } from './types'
import { UninstallDialog } from './uninstall-dialog'

/** SKILL.md minus its frontmatter — the README the registry page shows. */
function readmeOf(detail: SkillDetail | undefined): string {
  const skillMd = detail?.files.find((f) => f.path === 'SKILL.md')
  return skillMd
    ? skillMd.contents.replace(/^---[\s\S]*?---\n?/, '').trim()
    : ''
}

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-4 transition-colors hover:underline"
    >
      {children}
      <ExternalLinkIcon className="size-3" />
    </a>
  )
}

export function SkillDetailPage({
  item,
  onBack
}: {
  item: SkillRef
  onBack: () => void
}) {
  const { t, i18n } = useTranslation(['settings', 'common'])
  const slug = slugOf(item.id)

  const {
    data: detail,
    error,
    isLoading,
    mutate
  } = useSWR<SkillDetail>(detailKey(item.id))
  const { data: audit, isLoading: auditLoading } =
    useSWR<SkillAuditResponse | null>(auditKey(item.id))
  const { data: installedList } = useSWR<InstalledSkill[]>(INSTALLED_SKILLS_KEY)
  const installed = installedList?.find((s) => s.slug === slug) ?? null

  const [pending, setPending] = useState(false)
  const [confirmUninstall, setConfirmUninstall] = useState(false)

  const readme = useMemo(() => readmeOf(detail), [detail])
  const bundled = useMemo(
    () => detail?.files.filter((f) => f.path !== 'SKILL.md') ?? [],
    [detail]
  )
  const installs = detail?.installs ?? item.installs
  const command = cliInstallCommand(item.id)

  const failWith = (title: string, err: unknown) => {
    const description = getHttpErrorMessage(err, toErrorI18n(i18n))
    sileo.error({ title, description })
  }

  const handleInstall = async () => {
    setPending(true)
    try {
      const result = await installSkill(item.id)
      sileo.success({
        title: t('skillsMarket.toast.installedTitle', {
          name: result.displayName
        })
      })
    } catch (err) {
      failWith(t('skillsMarket.toast.installFailed'), err)
    } finally {
      setPending(false)
    }
  }

  const handleUninstall = async (skill: InstalledSkill) => {
    setConfirmUninstall(false)
    setPending(true)
    try {
      await uninstallSkill(skill.slug)
      sileo.success({
        title: t('skillsMarket.toast.uninstalledTitle', {
          name: skill.displayName
        })
      })
    } catch (err) {
      failWith(t('skillsMarket.toast.uninstallFailed'), err)
    } finally {
      setPending(false)
    }
  }

  const handleToggle = async (isActive: boolean) => {
    if (!installed) return
    try {
      await toggleSkill(installed.slug, isActive)
    } catch (err) {
      failWith(t('skillsMarket.toast.updateFailed'), err)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          data-testid={TEST_IDS.skillsMarket.backButton}
          onClick={onBack}
          className="text-muted-foreground -ml-2"
        >
          <ArrowLeftIcon />
          {t('skillsMarket.detail.back')}
        </Button>
      </div>

      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="truncate text-xl font-semibold">{item.name}</h2>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="truncate">{item.source}</span>
            {installs !== undefined && <Installs count={installs} />}
          </div>
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <ExternalLink href={item.url ?? skillsShSkill(item.id)}>
              {t('skillsMarket.detail.openOnSkillsSh')}
            </ExternalLink>
            <ExternalLink href={item.installUrl ?? githubRepoUrl(item.source)}>
              {t('skillsMarket.detail.openSource')}
            </ExternalLink>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {installed ? (
            <>
              <label className="text-muted-foreground flex items-center gap-2 text-xs">
                {t('skillsMarket.detail.active')}
                <Switch
                  data-testid={TEST_IDS.skillsMarket.activeSwitch}
                  checked={installed.isActive}
                  onCheckedChange={handleToggle}
                />
              </label>
              <Button
                variant="outline"
                size="sm"
                data-testid={TEST_IDS.skillsMarket.uninstallButton}
                disabled={pending}
                onClick={() => setConfirmUninstall(true)}
              >
                {pending && <Loader2Icon className="animate-spin" />}
                {t('skillsMarket.detail.uninstall')}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              data-testid={TEST_IDS.skillsMarket.installButton}
              disabled={pending || !detail}
              onClick={handleInstall}
            >
              <SwapLabel
                active={pending ? 'busy' : 'idle'}
                labels={{
                  idle: (
                    <>
                      <DownloadIcon />
                      {t('skillsMarket.detail.install')}
                    </>
                  ),
                  busy: (
                    <>
                      <Loader2Icon className="animate-spin" />
                      {t('skillsMarket.detail.installing')}
                    </>
                  )
                }}
              />
            </Button>
          )}
        </div>
      </header>

      <AuditPanel audit={audit} loading={auditLoading} />

      <SettingsSection title={t('skillsMarket.detail.cli.title')} plain>
        <div className="flex flex-col gap-2">
          <CommandLine
            command={command}
            commandTestId={TEST_IDS.skillsMarket.cliCommand}
            copyTestId={TEST_IDS.skillsMarket.copyCommandButton}
          />
          <p className="text-muted-foreground px-1 text-xs">
            {t('skillsMarket.detail.cli.description')}
          </p>
        </div>
      </SettingsSection>

      <SettingsSection title={t('skillsMarket.detail.readme')}>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : error ? (
          <SettingsEmpty
            icon={UnplugIcon}
            title={t('skillsMarket.detail.loadFailed')}
            description={t('skillsMarket.browse.loadFailedHint')}
          >
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              {t('common:action.retry')}
            </Button>
          </SettingsEmpty>
        ) : (
          <div className="text-sm">
            <Markdown src={readme} />
          </div>
        )}
      </SettingsSection>

      {bundled.length > 0 && (
        <Collapsible className="flex flex-col gap-2">
          <CollapsibleTrigger
            render={
              <Button
                variant="ghost"
                size="xs"
                className="text-muted-foreground group self-start"
              />
            }
          >
            <ChevronDownIcon className="transition-transform duration-200 group-data-panel-open:rotate-180" />
            {t('skillsMarket.detail.files', { count: bundled.length })}
          </CollapsibleTrigger>
          <CollapsibleContent>
            {/* Paths are what you'd type, so they stay mono. */}
            <Card className="divide-border gap-0 divide-y py-0">
              {bundled.map((f) => (
                <div
                  key={f.path}
                  className="truncate px-4 py-2 font-mono text-xs"
                >
                  {f.path}
                </div>
              ))}
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      <UninstallDialog
        skill={confirmUninstall ? installed : null}
        onOpenChange={(open) => {
          if (!open) setConfirmUninstall(false)
        }}
        onConfirm={handleUninstall}
      />
    </div>
  )
}
