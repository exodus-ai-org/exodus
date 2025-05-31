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
} from '@/components/ui/sidebar'
import { settingsLabelAtom } from '@/stores/settings'
import { useAtom } from 'jotai'
import { Bot } from 'lucide-react'
import * as React from 'react'
import { version } from '../../../../package.json'
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
            <SidebarMenuItem className="bg-sidebar sticky top-0 z-10">
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
      <SidebarRail />
    </Sidebar>
  )
}
