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
import { settingLabelAtom } from '@/stores/setting'
import { useAtom } from 'jotai'
import { ComponentProps } from 'react'
import { menus } from './setting-menu'

export function SettingsSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const [active, setActive] = useAtom(settingLabelAtom)

  return (
    <Sidebar {...props} collapsible="none" className="select-none">
      <SidebarContent className="no-scrollbar">
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
    </Sidebar>
  )
}
