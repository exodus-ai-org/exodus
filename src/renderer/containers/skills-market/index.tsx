import type {
  InstalledSkill,
  SearchResultItem,
  SkillItem
} from '@shared/types/skills'
import { fetcher } from '@shared/utils/http'
import {
  ChevronRightIcon,
  PackageCheckIcon,
  PackageIcon,
  SearchIcon,
  TriangleAlertIcon
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { selectSkillPath } from '@/lib/ipc'
import {
  installFromLocalPath,
  installSkill,
  toggleSkill,
  uninstallSkill
} from '@/services/skills-service'

import { InstallLocalButton } from './skill-actions'
import {
  InstalledSkillCard,
  RegistrySkillCard,
  SearchResultCard,
  SkillCardSkeleton
} from './skill-cards'

interface RegistryResponse {
  items: SkillItem[]
  nextCursor: string | null
}

type SearchResponse = SearchResultItem[]

type InstalledResponse = InstalledSkill[]

export function SkillsMarket() {
  const [search, setSearch] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null])
  const [pendingSlug, setPendingSlug] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const debouncedSearch = useDebouncedValue(search, 400)
  const isSearching = debouncedSearch.trim().length > 0

  // Registry list (paginated, only when not searching)
  const registryKey = !isSearching
    ? `/api/skills/registry${cursor ? `?cursor=${cursor}` : ''}`
    : null
  const {
    data: registryData,
    isLoading: registryLoading,
    error: registryError,
    mutate: mutateRegistry
  } = useSWR<RegistryResponse>(registryKey, fetcher)

  // Search results
  const searchKey = isSearching
    ? `/api/skills/search?q=${encodeURIComponent(debouncedSearch.trim())}`
    : null
  const { data: searchData, isLoading: searchLoading } = useSWR<SearchResponse>(
    searchKey,
    fetcher
  )

  // Installed skills
  const { data: installedData, mutate: mutateInstalled } =
    useSWR<InstalledResponse>('/api/skills/installed', fetcher)

  const installedSlugs = useMemo(
    () => new Set(installedData?.map((s) => s.slug) ?? []),
    [installedData]
  )

  const handleInstallFromRegistry = useCallback(
    async (skill: SkillItem) => {
      const version =
        skill.latestVersion?.version ?? skill.tags?.latest ?? 'latest'
      setPendingSlug(skill.slug)
      try {
        await installSkill(skill.slug, skill.displayName, version)
        await mutateInstalled()
        toast.success(`"${skill.displayName}" installed successfully`)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Install failed'
        toast.error(msg)
        console.error(e)
      } finally {
        setPendingSlug(null)
      }
    },
    [mutateInstalled]
  )

  const handleInstallFromSearch = useCallback(
    async (result: SearchResultItem) => {
      const slug = result.slug ?? ''
      const displayName = result.displayName ?? slug
      const version = result.version ?? 'latest'
      if (!slug) return
      setPendingSlug(slug)
      try {
        await installSkill(slug, displayName, version)
        await mutateInstalled()
        toast.success(`"${displayName}" installed successfully`)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Install failed'
        toast.error(msg)
        console.error(e)
      } finally {
        setPendingSlug(null)
      }
    },
    [mutateInstalled]
  )

  const handleUninstall = useCallback(
    async (slug: string) => {
      setPendingSlug(slug)
      try {
        await uninstallSkill(slug)
        await mutateInstalled()
        toast.success('Skill uninstalled')
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Uninstall failed'
        toast.error(msg)
        console.error(e)
      } finally {
        setPendingSlug(null)
      }
    },
    [mutateInstalled]
  )

  const handleToggle = useCallback(
    async (slug: string, isActive: boolean) => {
      try {
        await toggleSkill(slug, isActive)
        await mutateInstalled()
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to update skill'
        toast.error(msg)
        console.error(e)
      }
    },
    [mutateInstalled]
  )

  const handleInstallLocal = useCallback(async () => {
    const path = await selectSkillPath()
    if (!path) return
    setUploading(true)
    try {
      const installed = await installFromLocalPath(path)
      await mutateInstalled()
      toast.success(`"${installed.displayName}" installed successfully`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Install failed'
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }, [mutateInstalled])

  const handleNextPage = useCallback(() => {
    const nextCursor = registryData?.nextCursor ?? null
    if (nextCursor) {
      setCursorHistory((prev) => [...prev, nextCursor])
      setCursor(nextCursor)
    }
  }, [registryData])

  const handlePrevPage = useCallback(() => {
    if (cursorHistory.length <= 1) return
    const newHistory = cursorHistory.slice(0, -1)
    setCursorHistory(newHistory)
    setCursor(newHistory[newHistory.length - 1])
  }, [cursorHistory])

  const isFirstPage = cursorHistory.length <= 1
  const hasNextPage = Boolean(registryData?.nextCursor)

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex flex-1 flex-col gap-4 overflow-hidden px-6 py-4">
        {/* Search bar + upload */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <InstallLocalButton
            uploading={uploading}
            onClick={handleInstallLocal}
          />
        </div>

        <Alert>
          <TriangleAlertIcon />
          <AlertDescription>
            Skills data sourced from{' '}
            <a
              href="https://clawhub.ai/"
              target="_blank"
              rel="noopener noreferrer"
            >
              clawhub.ai
            </a>
            . Please review skills carefully before installing to avoid
            potentially malicious programs.
          </AlertDescription>
        </Alert>

        <Tabs
          defaultValue="browse"
          className="flex flex-1 flex-col overflow-hidden"
        >
          <TabsList className="w-full">
            <TabsTrigger value="browse" className="flex-1">
              <PackageIcon data-icon className="mr-1.5 size-3.5" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="installed" className="flex-1">
              <PackageCheckIcon data-icon className="mr-1.5 size-3.5" />
              Installed
              {installedData?.length ? (
                <Badge
                  variant="secondary"
                  className="ml-1.5 h-4 min-w-4 px-1 text-xs"
                >
                  {installedData.length}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          {/* Browse tab */}
          <TabsContent value="browse" className="mt-3 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-3">
                {/* Search results */}
                {isSearching && (
                  <>
                    {searchLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <SkillCardSkeleton key={i} />
                      ))
                    ) : searchData?.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <SearchIcon className="text-muted-foreground/40 mb-3 size-10" />
                        <p className="text-muted-foreground text-sm font-medium">
                          No results found
                        </p>
                        <p className="text-muted-foreground/70 mt-1 text-xs">
                          Try a different search term
                        </p>
                      </div>
                    ) : (
                      searchData?.map((result) => (
                        <SearchResultCard
                          key={result.slug ?? result.displayName}
                          result={result}
                          installedSlugs={installedSlugs}
                          pendingSlug={pendingSlug}
                          onInstall={handleInstallFromSearch}
                        />
                      ))
                    )}
                  </>
                )}

                {/* Registry list */}
                {!isSearching && (
                  <>
                    {registryLoading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <SkillCardSkeleton key={i} />
                      ))
                    ) : registryError ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <p className="text-muted-foreground text-sm font-medium">
                          Failed to load skills
                        </p>
                        <p className="text-muted-foreground/70 mt-1 text-xs">
                          Check your internet connection and try again
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => mutateRegistry()}
                        >
                          Retry
                        </Button>
                      </div>
                    ) : registryData?.items?.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <PackageIcon className="text-muted-foreground/40 mb-3 size-10" />
                        <p className="text-muted-foreground text-sm font-medium">
                          No skills available
                        </p>
                      </div>
                    ) : (
                      <>
                        {registryData?.items?.map((skill) => (
                          <RegistrySkillCard
                            key={skill.slug}
                            skill={skill}
                            installedSlugs={installedSlugs}
                            pendingSlug={pendingSlug}
                            onInstall={handleInstallFromRegistry}
                          />
                        ))}

                        {/* Pagination */}
                        {(hasNextPage || !isFirstPage) && (
                          <div className="flex items-center justify-between pt-2 pb-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handlePrevPage}
                              disabled={isFirstPage || registryLoading}
                            >
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleNextPage}
                              disabled={!hasNextPage || registryLoading}
                            >
                              Next
                              <ChevronRightIcon
                                data-icon
                                className="ml-1 size-3.5"
                              />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Installed tab */}
          <TabsContent
            value="installed"
            className="mt-3 flex-1 overflow-hidden"
          >
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-3 pr-3 pb-4">
                {!installedData ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <SkillCardSkeleton key={i} />
                  ))
                ) : installedData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <PackageIcon className="text-muted-foreground/40 mb-3 size-10" />
                    <p className="text-muted-foreground text-sm font-medium">
                      No skills installed
                    </p>
                    <p className="text-muted-foreground/70 mt-1 text-xs">
                      Browse the marketplace to find skills
                    </p>
                  </div>
                ) : (
                  installedData?.map((skill) => (
                    <InstalledSkillCard
                      key={skill.slug}
                      skill={skill}
                      pendingSlug={pendingSlug}
                      onUninstall={handleUninstall}
                      onToggle={handleToggle}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
