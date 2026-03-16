import { AgentXContainer } from '@/containers/agent-x'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import { cn } from '@/lib/utils'
import { ArrowLeftIcon } from 'lucide-react'
import { useNavigate } from 'react-router'

export function AgentXLayout() {
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
        <span className="text-sm font-medium">Agent X</span>
      </header>

      <main className="no-draggable bg-background flex min-h-0 flex-1 overflow-hidden">
        <AgentXContainer />
      </main>
    </div>
  )
}
