import { BotIcon, SettingsIcon } from 'lucide-react'
import React from 'react'
import { useLocation, useNavigate } from 'react-router'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'

export function NavFooter({
  ...props
}: React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={location.pathname.includes('agent-x')}
              onClick={() => navigate('/agent-x')}
            >
              <BotIcon />
              Agent X
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={location.pathname.includes('settings')}
              onClick={() => navigate('/settings')}
            >
              <SettingsIcon />
              Settings
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
