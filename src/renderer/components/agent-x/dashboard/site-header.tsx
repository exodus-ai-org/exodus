import { Separator } from '@/components/ui/separator'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import { cn } from '@/lib/utils'

interface SiteHeaderProps {
  title: string
}

export function SiteHeader({ title }: SiteHeaderProps) {
  const { open } = useSidebar()
  const isFullscreen = useIsFullscreen()

  return (
    <header
      className={cn(
        'draggable bg-background sticky top-0 flex h-14 shrink-0 items-center gap-2 border-b transition-[padding] duration-200 ease-linear',
        !open && !isFullscreen && 'pl-18'
      )}
    >
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="no-draggable -ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="text-base font-medium">{title}</h1>
      </div>
    </header>
  )
}
