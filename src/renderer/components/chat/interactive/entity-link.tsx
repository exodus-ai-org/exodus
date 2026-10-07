import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import { entityTitle, wikipediaLang } from '@exodus/shared/utils/entity-link'
import { useQuery } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { defaultUrlTransform } from 'react-markdown'

import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { getEntitySummary } from '@/services/entity-service'

/** The most of an extract the panel shows; "Read more" has the rest. */
const EXTRACT_MAX = 600
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * react-markdown's URL rule, plus ours: a valid `entity:` href passes
 * through to the `a` renderer (which draws it as `EntityLink`, never as an
 * anchor); everything else is the default's call — `http(s)`, `mailto` and
 * a few more pass, any other scheme is emptied.
 */
export function markdownUrlTransform(url: string): string {
  return entityTitle(url) !== null ? url : defaultUrlTransform(url)
}

/**
 * `[Marie Curie](entity:Marie_Curie)` in a reply: the name, dotted under,
 * opening a popover with Wikipedia's summary (spec 2026-10-07 §2.2). The
 * summary is fetched when the popover opens, never when the link is drawn.
 */
export function EntityLink({
  title,
  children
}: {
  title: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-testid={TEST_IDS.chat.richBlocks.entityLink}
        data-entity={title}
        className="text-primary-ink cursor-pointer underline decoration-dotted underline-offset-4 hover:decoration-solid"
      >
        {children}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        {open && <EntityPanel title={title} />}
      </PopoverContent>
    </Popover>
  )
}

/** What the popover holds: loading, the summary, "nothing found", or "could not reach". */
export function EntityPanel({ title }: { title: string }) {
  const { t, i18n } = useTranslation('chat')
  const lang = wikipediaLang(i18n.resolvedLanguage ?? i18n.language ?? 'en')
  const { data, isPending, isError } = useQuery({
    queryKey: ['entity', lang, title],
    queryFn: () => getEntitySummary(title, lang),
    staleTime: DAY_MS
  })
  return (
    <div
      data-testid={TEST_IDS.chat.richBlocks.entityPanel}
      className="flex flex-col gap-2 p-4"
    >
      {isPending ? (
        <p className="text-muted-foreground text-sm">
          {t('richBlocks.entityLoading')}
        </p>
      ) : isError || !data ? (
        <p className="text-muted-foreground text-sm">
          {t('richBlocks.entityFailed')}
        </p>
      ) : data.extract === null ? (
        <>
          <p className="text-sm font-semibold">{data.title}</p>
          <p className="text-muted-foreground text-sm">
            {t('richBlocks.entityNothing')}
          </p>
        </>
      ) : (
        <>
          <div className="flex items-start gap-3">
            {data.thumbnail && (
              <img
                src={data.thumbnail.source}
                alt=""
                width={64}
                height={Math.round(
                  (64 * data.thumbnail.height) / data.thumbnail.width
                )}
                className="size-16 shrink-0 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold">{data.title}</p>
              {data.description && (
                <p className="text-muted-foreground text-xs">
                  {data.description}
                </p>
              )}
            </div>
          </div>
          <p className="text-sm leading-6">
            {data.extract.length > EXTRACT_MAX
              ? `${data.extract.slice(0, EXTRACT_MAX)}…`
              : data.extract}
          </p>
          {data.url && (
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-ink text-sm hover:underline"
            >
              {t('richBlocks.readMore')}
            </a>
          )}
        </>
      )}
    </div>
  )
}
