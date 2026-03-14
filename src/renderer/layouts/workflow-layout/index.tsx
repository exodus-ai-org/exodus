import { Workflow } from '@/containers/workflow'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import { cn } from '@/lib/utils'
import { ArrowLeftIcon } from 'lucide-react'
import { useNavigate } from 'react-router'

export function WorkflowLayout() {
  const navigate = useNavigate()
  const isFullscreen = useIsFullscreen()

  return (
    <div className="flex h-screen flex-col">
      <header
        className={cn(
          'draggable bg-background flex h-14 shrink-0 items-center gap-3 border-b',
          isFullscreen ? 'pl-4' : 'pl-21'
        )}
      >
        <button
          onClick={() => navigate(-1)}
          className="no-draggable text-muted-foreground hover:text-foreground hover:bg-accent flex h-7 w-7 items-center justify-center rounded-md transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">Workflow</span>
      </header>

      <main className="flex min-h-0 flex-1 overflow-hidden">
        <Workflow />
      </main>
    </div>
  )
}
