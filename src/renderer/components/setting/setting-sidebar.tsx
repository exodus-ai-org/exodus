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
import { settingLabelAtom } from '@/stores/setting'
import { useAtom } from 'jotai'
import { ComponentProps, useRef, useState } from 'react'
import { menus } from './setting-menu'

export function SettingsSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useAtom(settingLabelAtom)
  const [isBottom, setIsBottom] = useState(false)

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return

    setIsBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 1)
  }

  return (
    <Sidebar {...props} collapsible="none" className="select-none">
      <SidebarContent
        className="no-scrollbar"
        ref={containerRef}
        onScroll={handleScroll}
      >
        <SidebarGroup>
          <SidebarMenu className="gap-1">
            {menus.navMain.map((item) => (
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
                          isActive={item.title === active}
                          onClick={() => setActive(item.title)}
                        >
                          {item.title}
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
          'from-card pointer-events-none visible absolute bottom-0 left-0 h-25 w-full bg-linear-to-t to-transparent opacity-100 transition',
          {
            ['invisible opacity-0 transition']: isBottom
          }
        )}
      />
    </Sidebar>
  )
}
