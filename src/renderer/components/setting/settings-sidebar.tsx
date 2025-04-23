import { settingsLabelAtom } from '@/stores/setting'
import { useAtom } from 'jotai'
import * as React from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail
} from '../ui/sidebar'
import { schema } from './settings-schema'

export function SettingsSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const [active, setActive] = useAtom(settingsLabelAtom)

  return (
    <Sidebar {...props} className="max-h-[498px] select-none">
      <SidebarContent className="h-[300px]">
        <SidebarGroup>
          <SidebarMenu>
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
      <SidebarRail />
    </Sidebar>
  )
}
