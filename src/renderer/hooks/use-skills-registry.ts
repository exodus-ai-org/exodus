import type { SkillsView } from '@exodus/shared/types/skills'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import {
  getCuratedSkills,
  getSkillAudit,
  getSkillDetail,
  getSkillsRegistry,
  searchSkills
} from '@/services/skills'

export const skillsKeys = {
  registry: (view: SkillsView) => ['skills', 'registry', view] as const,
  search: (query: string) => ['skills', 'search', query] as const,
  detail: (id: string) => ['skills', 'detail', id] as const,
  audit: (id: string) => ['skills', 'audit', id] as const,
  curated: ['skills', 'curated'] as const
}

// These read the skills.sh relay, which changes slowly and costs a network
// hop: a tab switch or a remount must not fetch again (an infinite query
// re-reads every page it holds once stale).
const REGISTRY_STALE_MS = 5 * 60_000
// The curated list is ~2 MB and takes no parameters. `gcTime` matches: past
// the default 5 minutes an unmounted query is dropped, making staleTime moot.
const CURATED_STALE_MS = 10 * 60_000

/**
 * One view's leaderboard, a page at a time. The Skills Market's "All time (n)"
 * tab reads its total from `pages[0]` of this same query, so tab and list
 * share one request.
 */
export function useSkillsInfiniteRegistry(view: SkillsView) {
  const {
    data,
    error,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: skillsKeys.registry(view),
    queryFn: ({ pageParam }) => getSkillsRegistry(view, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.pagination.hasMore ? allPages.length : undefined,
    staleTime: REGISTRY_STALE_MS
  })
  return {
    data,
    error,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch
  }
}

export function useSkillsSearch(query: string) {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: skillsKeys.search(query),
    queryFn: () => searchSkills(query),
    enabled: !!query,
    staleTime: REGISTRY_STALE_MS
  })
  return { data, error, isLoading, refetch }
}

export function useSkillDetail(id: string) {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: skillsKeys.detail(id),
    queryFn: () => getSkillDetail(id),
    staleTime: REGISTRY_STALE_MS
  })
  return { data, error, isLoading, refetch }
}

// `data` is `null` (a settled read, not an error) for an unaudited skill.
export function useSkillAudit(id: string) {
  const { data, isLoading } = useQuery({
    queryKey: skillsKeys.audit(id),
    queryFn: () => getSkillAudit(id),
    staleTime: REGISTRY_STALE_MS
  })
  return { data, isLoading }
}

export function useCuratedSkills() {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: skillsKeys.curated,
    queryFn: () => getCuratedSkills(),
    staleTime: CURATED_STALE_MS,
    gcTime: CURATED_STALE_MS
  })
  return { data, error, isLoading, refetch }
}
