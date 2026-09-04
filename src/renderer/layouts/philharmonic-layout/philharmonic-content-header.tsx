import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import { cn } from '@/lib/utils'

/**
 * Thin chrome bar at the top of the Philharmonic content pane for the config
 * pages (Workforce / Knowledge / Dashboard) and the empty state — mirrors the
 * chat layout's ContentHeader. Holds the sidebar toggle with traffic-light
 * aware padding when the sidebar is collapsed. A group chat renders its own
 * header instead (see GroupChat).
 */
export function PhilharmonicContentHeader() {
  const { open } = useSidebar()
  const isFullscreen = useIsFullscreen()

  return (
    <header
      className={cn(
        'draggable border-border bg-card/80 flex h-12 shrink-0 items-center rounded-tl-xl border-b pr-3 backdrop-blur-sm transition-[padding] duration-200 ease-linear',
        open ? 'pl-1' : isFullscreen ? 'pl-4' : 'pl-21'
      )}
    >
      <SidebarTrigger className="no-drag text-muted-foreground hover:text-foreground" />
    </header>
  )
}
