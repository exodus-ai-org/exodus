import { cn } from '@/lib/utils'
import { openTabsAtom } from '@/stores/chat'
import { useAtom } from 'jotai'
import { XIcon } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'

export function ChatTabs() {
  const [tabs, setTabs] = useAtom(openTabsAtom)
  const { id: activeId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  if (tabs.length === 0) return null

  const closeTab = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const tabIndex = tabs.findIndex((t) => t.id === tabId)
    const newTabs = tabs.filter((t) => t.id !== tabId)
    setTabs(newTabs)
    if (tabId === activeId) {
      if (newTabs.length > 0) {
        navigate(`/chat/${newTabs[Math.max(0, tabIndex - 1)].id}`)
      } else {
        navigate('/')
      }
    }
  }

  return (
    <div className="no-draggable flex h-full items-end overflow-x-auto">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          to={`/chat/${tab.id}`}
          className={cn(
            'group relative flex h-8 shrink-0 items-center gap-1 px-3 text-xs whitespace-nowrap transition-colors',
            tab.id === activeId
              ? 'border-primary text-foreground border-b-2'
              : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
          )}
        >
          <span className="max-w-32 truncate">{tab.title}</span>
          <button
            onClick={(e) => closeTab(e, tab.id)}
            className="hover:text-foreground ml-0.5 rounded opacity-0 transition-opacity group-hover:opacity-100"
          >
            <XIcon size={11} />
          </button>
        </Link>
      ))}
    </div>
  )
}
