import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { settingsLabelAtom } from '@/stores/settings'
import { useAtom } from 'jotai'
import { Bot } from 'lucide-react'
import { ComponentProps, useRef, useState } from 'react'
import { version } from '../../../../package.json'
import { schema } from './settings-schema'

export function SettingsSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useAtom(settingsLabelAtom)
  const [isBottom, setIsBottom] = useState(false)

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return

    setIsBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 1)
  }

  return (
    <Sidebar {...props} className="max-h-[498px] select-none">
      <SidebarContent
        className="no-scrollbar h-[300px]"
        ref={containerRef}
        onScroll={handleScroll}
      >
        <SidebarGroup className="pt-0">
          <SidebarMenu>
            <SidebarMenuItem className="bg-sidebar sticky top-0 z-10 p-2 pb-0">
              <SidebarMenuButton size="lg" asChild>
                <div>
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Bot className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Exodus</span>
                    <span className="truncate text-xs">v{version}</span>
                  </div>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {schema.navMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  isActive={item.title === active}
                  onClick={() => {
                    setActive(item.title)
                  }}
                >
                  {item.icon && <item.icon />}
                  {item.title}
                </SidebarMenuButton>
                {item.items?.length ? (
                  <SidebarMenuSub>
                    {item.items.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={item.title === active}
                          onClick={() => setActive(item.title)}
                        >
                          <p>{item.title}</p>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <div
        className={cn(
          'from-card pointer-events-none visible absolute bottom-0 left-0 h-25 w-full bg-gradient-to-t to-transparent opacity-100 transition',
          { ['invisible opacity-0 transition']: isBottom }
        )}
      />
    </Sidebar>
  )
}
