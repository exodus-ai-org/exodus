import { clawhubSkill } from '@shared/constants/external-urls'
import type {
  InstalledSkill,
  SearchResultItem,
  SkillItem
} from '@shared/types/skills'
import {
  DownloadIcon,
  ExternalLinkIcon,
  Loader2Icon,
  PackageCheckIcon,
  StarIcon,
  Trash2Icon
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'

export function SkillCardSkeleton() {
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

export interface RegistrySkillCardProps {
  skill: SkillItem
  installedSlugs: Set<string>
  pendingSlug: string | null
  onInstall: (skill: SkillItem) => void
}

export function RegistrySkillCard({
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
            <a
              href={clawhubSkill(
                skill.ownerHandle
                  ? `${skill.ownerHandle}/${skill.slug}`
                  : skill.slug
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 truncate text-sm leading-tight font-semibold hover:underline"
            >
              {skill.displayName}
              <ExternalLinkIcon className="size-3 shrink-0 opacity-50" />
            </a>
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

export interface SearchResultCardProps {
  result: SearchResultItem
  installedSlugs: Set<string>
  pendingSlug: string | null
  onInstall: (result: SearchResultItem) => void
}

export function SearchResultCard({
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
            <a
              href={clawhubSkill(slug)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 truncate text-sm leading-tight font-semibold hover:underline"
            >
              {result.displayName ?? slug}
              <ExternalLinkIcon className="size-3 shrink-0 opacity-50" />
            </a>
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

export interface InstalledSkillCardProps {
  skill: InstalledSkill
  pendingSlug: string | null
  onUninstall: (slug: string) => void
  onToggle: (slug: string, isActive: boolean) => void
}

export function InstalledSkillCard({
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
            <a
              href={clawhubSkill(skill.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 truncate text-sm leading-tight font-semibold hover:underline"
            >
              {skill.displayName}
              <ExternalLinkIcon className="size-3 shrink-0 opacity-50" />
            </a>
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
