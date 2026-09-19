import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import type {
  InstalledSkill,
  SkillListResponse,
  SkillsView
} from '@exodus/shared/types/skills'
import { SearchIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import useSWR from 'swr'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from '@/components/ui/input-group'
import { Kbd } from '@/components/ui/kbd'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { useFormat } from '@/lib/format'
import { INSTALLED_SKILLS_KEY, registryKey } from '@/services/skills'

import { CliNotice } from './cli-notice'
import { InstalledSkillsList } from './installed-list'
import { RegistryLeaderboard, SearchResults } from './leaderboard'
import { SkillDetailPage } from './skill-detail'
import { SkillsSourceNotice } from './source-notice'
import { refFromListItem, type SkillRef } from './types'

const VIEWS: SkillsView[] = ['all-time', 'trending', 'hot']

/** `/` focuses the search unless the user is already typing somewhere. */
function useSlashToFocus(ref: React.RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = document.activeElement as HTMLElement | null
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.isContentEditable)
      )
        return
      e.preventDefault()
      ref.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [ref])
}

export function SkillsMarket() {
  const { t } = useTranslation('settings')
  const { number } = useFormat()
  const [query, setQuery] = useState('')
  const [view, setView] = useState<SkillsView>('all-time')
  const [selected, setSelected] = useState<SkillRef | null>(null)
  const debouncedQuery = useDebouncedValue(query.trim(), 350)
  const searchRef = useRef<HTMLInputElement>(null)
  useSlashToFocus(searchRef)

  const { data: installedList } = useSWR<InstalledSkill[]>(INSTALLED_SKILLS_KEY)
  const installedSlugs = useMemo(
    () => new Set(installedList?.map((s) => s.slug) ?? []),
    [installedList]
  )
  // The registry's total, for the "All time (n)" tab — same key as the
  // leaderboard's first page, so it is one request, not two.
  const { data: firstPage } = useSWR<SkillListResponse>(
    registryKey('all-time', 0)
  )
  const total = firstPage?.pagination.total

  const viewLabel = (v: SkillsView) => {
    if (v === 'trending') return t('skillsMarket.views.trending')
    if (v === 'hot') return t('skillsMarket.views.hot')
    return total === undefined
      ? t('skillsMarket.views.allTime')
      : t('skillsMarket.views.allTimeWithTotal', { total: number(total) })
  }

  if (selected) {
    return <SkillDetailPage item={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="flex flex-col gap-6">
      <SkillsSourceNotice />

      <Tabs defaultValue="discover" className="flex flex-col gap-5">
        <TabsList variant="line">
          <TabsTrigger
            value="discover"
            data-testid={TEST_IDS.skillsMarket.discoverTab}
          >
            {t('skillsMarket.tabs.discover')}
          </TabsTrigger>
          <TabsTrigger
            value="installed"
            data-testid={TEST_IDS.skillsMarket.installedTab}
          >
            {t('skillsMarket.tabs.installed')}
            {installedList?.length ? (
              <span className="text-muted-foreground font-mono tabular-nums">
                {installedList.length}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="flex flex-col gap-4">
          <InputGroup>
            <InputGroupInput
              ref={searchRef}
              data-testid={TEST_IDS.skillsMarket.searchInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('skillsMarket.searchPlaceholder')}
            />
            <InputGroupAddon align="inline-start">
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <Kbd>{'/'}</Kbd>
            </InputGroupAddon>
          </InputGroup>

          {debouncedQuery ? (
            <SearchResults
              query={debouncedQuery}
              installedSlugs={installedSlugs}
              onOpen={(item) => setSelected(refFromListItem(item))}
            />
          ) : (
            <Tabs
              value={view}
              onValueChange={(v) => setView(v as SkillsView)}
              className="flex flex-col gap-4"
            >
              <TabsList
                variant="line"
                data-testid={TEST_IDS.skillsMarket.viewToggle}
                className="font-mono"
              >
                {VIEWS.map((v) => (
                  <TabsTrigger key={v} value={v}>
                    {viewLabel(v)}
                  </TabsTrigger>
                ))}
              </TabsList>
              <RegistryLeaderboard
                view={view}
                installedSlugs={installedSlugs}
                onOpen={(item) => setSelected(refFromListItem(item))}
              />
            </Tabs>
          )}
        </TabsContent>

        <TabsContent value="installed">
          <InstalledSkillsList onOpen={setSelected} />
        </TabsContent>
      </Tabs>

      <CliNotice />
    </div>
  )
}
