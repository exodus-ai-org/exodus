import { NavMain } from '@/components/agent-x/dashboard/nav-main'
import { NavSecondary } from '@/components/agent-x/dashboard/nav-secondary'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import { cn } from '@/lib/utils'
import {
  ArrowLeftIcon,
  BotIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  NetworkIcon,
  PlugIcon
} from 'lucide-react'
import { useNavigate } from 'react-router'

const navMainItems = [
  {
    title: 'Dashboard',
    page: 'dashboard',
    icon: <LayoutDashboardIcon />
  },
  {
    title: 'Org Editor',
    page: 'org-editor',
    icon: <NetworkIcon />
  },
  {
    title: 'Tasks',
    page: 'tasks',
    icon: <ListChecksIcon />
  },
  {
    title: 'MCP Servers',
    page: 'mcp',
    icon: <PlugIcon />
  }
]

const navSecondaryItems = [
  {
    title: 'Back to Chat',
    url: '/',
    icon: <ArrowLeftIcon />
  }
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activePage: string
  onNavigate: (page: string) => void
}

export function AppSidebar({
  activePage,
  onNavigate,
  ...props
}: AppSidebarProps) {
  const navigate = useNavigate()
  const isFullscreen = useIsFullscreen()

  return (
    <Sidebar collapsible="offcanvas" {...props} className="border-none">
      <SidebarHeader
        className={cn('transition-all', isFullscreen ? 'pt-2' : 'pt-13')}
      >
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="data-[slot=sidebar-menu-button]:p-1.5!">
              <BotIcon className="size-5!" />
              <span className="text-base font-semibold">Agent X</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={navMainItems}
          activePage={activePage}
          onNavigate={onNavigate}
        />
        <NavSecondary
          items={navSecondaryItems}
          className="mt-auto"
          onItemClick={(url) => navigate(url)}
        />
      </SidebarContent>
    </Sidebar>
  )
}
