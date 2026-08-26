import { useAtom } from 'jotai'
import { ComponentProps } from 'react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar'
import { settingsLabelAtom } from '@/stores/settings'

import { menus } from './settings-menu'

export function SettingsSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const [active, setActive] = useAtom(settingsLabelAtom)

  return (
    <Sidebar {...props} collapsible="none" className="select-none">
      <SidebarContent className="no-scrollbar gap-2">
        {menus.navMain.map((group) => (
          <SidebarGroup key={group.label} className="gap-1">
            <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1">
              {group.items.map((item) => (
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
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
