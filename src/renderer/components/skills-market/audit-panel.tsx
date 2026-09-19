import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import type {
  SkillAuditResponse,
  SkillAuditStatus
} from '@exodus/shared/types/skills'
import { ShieldAlertIcon, ShieldCheckIcon, ShieldXIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useFormat } from '@/lib/format'
import { cn } from '@/lib/utils'

import { SectionLabel } from './section-label'

const STATUS: Record<
  SkillAuditStatus,
  { Icon: typeof ShieldCheckIcon; text: string; bar: string }
> = {
  pass: {
    Icon: ShieldCheckIcon,
    text: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500'
  },
  warn: {
    Icon: ShieldAlertIcon,
    text: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500'
  },
  fail: {
    Icon: ShieldXIcon,
    text: 'text-red-600 dark:text-red-400',
    bar: 'bg-red-500'
  }
}

/**
 * The security audit — one segment of the bar and one row per provider.
 * Audit quality is why skills.sh replaced ClawHub, so this sits above the
 * README and before the install button gets pressed.
 */
export function AuditPanel({
  audit,
  loading
}: {
  audit: SkillAuditResponse | null | undefined
  loading: boolean
}) {
  const { t } = useTranslation('settings')
  const { relativeTime } = useFormat()
  const audits = audit?.audits ?? []
  const passed = audits.filter((a) => a.status === 'pass').length

  return (
    <section
      data-testid={TEST_IDS.skillsMarket.auditPanel}
      className="flex flex-col gap-3 rounded-xl border p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <SectionLabel>{t('skillsMarket.detail.audit.title')}</SectionLabel>
        {audits.length > 0 && (
          <span className="text-muted-foreground text-xs">
            {t('skillsMarket.detail.audit.summary', {
              passed,
              total: audits.length
            })}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-1.5 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : audits.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          {t('skillsMarket.detail.audit.none')}
        </p>
      ) : (
        <>
          <div className="flex gap-1" aria-hidden>
            {audits.map((a) => (
              <span
                key={a.slug}
                className={cn(
                  'h-1.5 flex-1 rounded-full',
                  STATUS[a.status].bar
                )}
              />
            ))}
          </div>
          <ul className="divide-border flex flex-col divide-y">
            {audits.map((a) => {
              const { Icon, text } = STATUS[a.status]
              return (
                <li key={a.slug} className="flex items-start gap-3 py-2.5">
                  <Icon className={cn('mt-0.5 size-4 shrink-0', text)} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{a.provider}</span>
                      <span className={cn('text-xs', text)}>
                        {t(`skillsMarket.detail.audit.status.${a.status}`)}
                      </span>
                      {a.riskLevel && (
                        <Badge variant="outline" className="h-4 px-1.5">
                          {a.riskLevel}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                      {a.summary}
                    </p>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {t('skillsMarket.detail.audit.auditedAt', {
                      date: relativeTime(new Date(a.auditedAt))
                    })}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
