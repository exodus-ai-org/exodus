import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { selectSkillPath } from '@/lib/ipc'
import {
  installFromLocalPath,
  installSkill,
  toggleSkill,
  uninstallSkill
} from '@/services/skills-service'
import type {
  InstalledSkill,
  SearchResultItem,
  SkillItem
} from '@shared/types/skills'
import { fetcher } from '@shared/utils/http'
import {
  ChevronRightIcon,
  DownloadIcon,
  Loader2Icon,
  PackageCheckIcon,
  PackageIcon,
  SearchIcon,
  StarIcon,
  Trash2Icon,
  UploadIcon
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'

interface RegistryResponse {
  ok: boolean
  data: {
    items: SkillItem[]
    nextCursor: string | null
  }
}

interface SearchResponse {
  ok: boolean
  data: SearchResultItem[]
}

interface InstalledResponse {
  ok: boolean
  data: InstalledSkill[]
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function SkillCardSkeleton() {
  return (
    <div className="bg-card flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <Skeleton className="h-8 w-20 shrink-0" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  )
}

interface RegistrySkillCardProps {
  skill: SkillItem
  installedSlugs: Set<string>
  pendingSlug: string | null
  onInstall: (skill: SkillItem) => void
}

function RegistrySkillCard({
  skill,
  installedSlugs,
  pendingSlug,
  onInstall
}: RegistrySkillCardProps) {
  const isInstalled = installedSlugs.has(skill.slug)
  const isLoading = pendingSlug === skill.slug
  const version = skill.latestVersion?.version ?? skill.tags?.latest ?? 'latest'

  return (
    <div className="bg-card hover:bg-accent/30 flex flex-col gap-3 rounded-lg border p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            {skill.ownerImage && (
              <img
                src={skill.ownerImage}
                alt=""
                className="size-5 shrink-0 rounded-full"
              />
            )}
            <h3 className="truncate text-sm leading-tight font-semibold">
              {skill.displayName}
            </h3>
            <Badge variant="outline" className="shrink-0 text-xs">
              v{version}
            </Badge>
          </div>
          {skill.ownerHandle && (
            <p className="text-muted-foreground mb-1 text-xs">
              @{skill.ownerHandle}
            </p>
          )}
          {skill.summary && (
            <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
              {skill.summary}
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant={isInstalled ? 'secondary' : 'default'}
          disabled={isInstalled || isLoading}
          onClick={() => onInstall(skill)}
          className="shrink-0"
        >
          {isLoading ? (
            <Loader2Icon data-icon className="size-3.5 animate-spin" />
          ) : isInstalled ? (
            <>
              <PackageCheckIcon data-icon className="mr-1 size-3.5" />
              Installed
            </>
          ) : (
            <>
              <DownloadIcon data-icon className="mr-1 size-3.5" />
              Install
            </>
          )}
        </Button>
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
        {skill.stats?.downloads != null && (
          <span className="flex items-center gap-1">
            <DownloadIcon className="size-3" />
            {skill.stats.downloads.toLocaleString()}
          </span>
        )}
        {skill.stats?.stars != null && (
          <span className="flex items-center gap-1">
            <StarIcon className="size-3" />
            {skill.stats.stars.toLocaleString()}
          </span>
        )}
        {skill.stats?.installsAllTime != null && (
          <span className="flex items-center gap-1">
            <PackageCheckIcon className="size-3" />
            {skill.stats.installsAllTime.toLocaleString()} installs
          </span>
        )}
      </div>
    </div>
  )
}

interface SearchResultCardProps {
  result: SearchResultItem
  installedSlugs: Set<string>
  pendingSlug: string | null
  onInstall: (result: SearchResultItem) => void
}

function SearchResultCard({
  result,
  installedSlugs,
  pendingSlug,
  onInstall
}: SearchResultCardProps) {
  const slug = result.slug ?? ''
  const isInstalled = installedSlugs.has(slug)
  const isLoading = pendingSlug === slug

  return (
    <div className="bg-card hover:bg-accent/30 flex flex-col gap-2 rounded-lg border p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate text-sm leading-tight font-semibold">
              {result.displayName ?? slug}
            </h3>
            {result.version && (
              <Badge variant="outline" className="shrink-0 text-xs">
                v{result.version}
              </Badge>
            )}
          </div>
          {result.summary && (
            <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
              {result.summary}
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant={isInstalled ? 'secondary' : 'default'}
          disabled={isInstalled || isLoading || !slug}
          onClick={() => onInstall(result)}
          className="shrink-0"
        >
          {isLoading ? (
            <Loader2Icon data-icon className="size-3.5 animate-spin" />
          ) : isInstalled ? (
            <>
              <PackageCheckIcon data-icon className="mr-1 size-3.5" />
              Installed
            </>
          ) : (
            <>
              <DownloadIcon data-icon className="mr-1 size-3.5" />
              Install
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

interface InstalledSkillCardProps {
  skill: InstalledSkill
  pendingSlug: string | null
  onUninstall: (slug: string) => void
  onToggle: (slug: string, isActive: boolean) => void
}

function InstalledSkillCard({
  skill,
  pendingSlug,
  onUninstall,
  onToggle
}: InstalledSkillCardProps) {
  const isLoading = pendingSlug === skill.slug

  return (
    <div className="bg-card hover:bg-accent/30 flex flex-col gap-3 rounded-lg border p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate text-sm leading-tight font-semibold">
              {skill.displayName}
            </h3>
            {skill.version && skill.version !== 'local' && (
              <Badge variant="outline" className="shrink-0 text-xs">
                v{skill.version}
              </Badge>
            )}
            {skill.version === 'local' && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                Local
              </Badge>
            )}
            {skill.isActive ? (
              <Badge variant="default" className="shrink-0 text-xs">
                Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="shrink-0 text-xs">
                Inactive
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            Installed {new Date(skill.installedAt).toLocaleDateString()}
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          disabled={isLoading}
          onClick={() => onUninstall(skill.slug)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
        >
          {isLoading ? (
            <Loader2Icon data-icon className="size-3.5 animate-spin" />
          ) : (
            <Trash2Icon data-icon className="size-3.5" />
          )}
        </Button>
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-medium">Inject into system prompt</p>
          <p className="text-muted-foreground text-xs">
            When active, this skill's instructions are sent to the AI
          </p>
        </div>
        <Switch
          checked={skill.isActive}
          onCheckedChange={(checked) => onToggle(skill.slug, checked)}
        />
      </div>
    </div>
  )
}

export function SkillsMarket() {
  const [search, setSearch] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null])
  const [pendingSlug, setPendingSlug] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const debouncedSearch = useDebounce(search, 400)
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

  const installedSlugs = new Set(installedData?.data?.map((s) => s.slug) ?? [])

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
        toast.error(`Failed to install "${skill.displayName}"`)
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
        toast.error(`Failed to install "${displayName}"`)
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
        toast.error('Failed to uninstall skill')
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
        toast.error('Failed to update skill')
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
    const nextCursor = registryData?.data?.nextCursor ?? null
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
  const hasNextPage = Boolean(registryData?.data?.nextCursor)

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
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={handleInstallLocal}
          >
            {uploading ? (
              <Loader2Icon data-icon className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <UploadIcon data-icon className="mr-1.5 size-3.5" />
            )}
            Install Local
          </Button>
        </div>

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
              {installedData?.data?.length ? (
                <Badge
                  variant="secondary"
                  className="ml-1.5 h-4 min-w-4 px-1 text-xs"
                >
                  {installedData.data.length}
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
                    ) : searchData?.data?.length === 0 ? (
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
                      searchData?.data?.map((result) => (
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
                    ) : registryData?.data?.items?.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <PackageIcon className="text-muted-foreground/40 mb-3 size-10" />
                        <p className="text-muted-foreground text-sm font-medium">
                          No skills available
                        </p>
                      </div>
                    ) : (
                      <>
                        {registryData?.data?.items?.map((skill) => (
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
                ) : installedData.data?.length === 0 ? (
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
                  installedData.data?.map((skill) => (
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
