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
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
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
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useClipboard } from '@/hooks/use-clipboard'
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
import { SectionLabel } from './section-label'
import { useCompactNumber } from './skill-row'
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
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
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
  const compact = useCompactNumber()
  const { copied, handleCopy } = useClipboard()
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
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 className="truncate text-xl font-semibold">{item.name}</h2>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs">
            <span className="truncate">{item.source}</span>
            {installs !== undefined && (
              <span className="inline-flex items-center gap-1">
                <DownloadIcon className="size-3.5" />
                {t('skillsMarket.card.installs', {
                  formatted: compact(installs)
                })}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4">
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
              {pending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <DownloadIcon />
              )}
              {pending
                ? t('skillsMarket.detail.installing')
                : t('skillsMarket.detail.install')}
            </Button>
          )}
        </div>
      </header>

      <AuditPanel audit={audit} loading={auditLoading} />

      <section className="flex flex-col gap-2">
        <SectionLabel>{t('skillsMarket.detail.cli.title')}</SectionLabel>
        <div className="bg-muted/40 flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-sm">
          <span className="text-muted-foreground select-none">{'$'}</span>
          <code
            data-testid={TEST_IDS.skillsMarket.cliCommand}
            className="min-w-0 flex-1 truncate"
          >
            {command}
          </code>
          <Button
            variant="ghost"
            size="icon-xs"
            data-testid={TEST_IDS.skillsMarket.copyCommandButton}
            aria-label={t('common:action.copy')}
            onClick={() => handleCopy(command)}
          >
            {copied === command ? <CheckIcon /> : <CopyIcon />}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          {t('skillsMarket.detail.cli.description')}
        </p>
      </section>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ) : error ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UnplugIcon />
            </EmptyMedia>
            <EmptyTitle>{t('skillsMarket.detail.loadFailed')}</EmptyTitle>
            <EmptyDescription>
              {t('skillsMarket.browse.loadFailedHint')}
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            {t('common:action.retry')}
          </Button>
        </Empty>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <SectionLabel>{t('skillsMarket.detail.readme')}</SectionLabel>
            <div className="rounded-xl border px-5 py-4 text-sm">
              <Markdown src={readme} />
            </div>
          </section>

          {bundled.length > 0 && (
            <Collapsible className="flex flex-col gap-2">
              <CollapsibleTrigger className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1 self-start text-xs">
                <ChevronDownIcon className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
                {t('skillsMarket.detail.files', { count: bundled.length })}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="divide-border divide-y rounded-xl border">
                  {bundled.map((f) => (
                    <li
                      key={f.path}
                      className="truncate px-3 py-1.5 font-mono text-xs"
                    >
                      {f.path}
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
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
