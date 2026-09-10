import { TEST_IDS } from '@shared/constants/test-ids'
import { MoreHorizontalIcon, SettingsIcon } from 'lucide-react'
import React from 'react'
import { useLocation, useNavigate } from 'react-router'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { useSettings } from '@/hooks/use-settings'

export function NavFooter({
  ...props
}: React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: settings } = useSettings()

  const onSettings = location.pathname.includes('settings')
  const nickname = settings?.personality?.nickname?.trim() || 'You'

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={onSettings}
              data-testid={TEST_IDS.chatLayout.account}
              onClick={() => navigate('/settings')}
            >
              <Avatar size="sm">
                <AvatarImage src={settings?.userAvatar ?? undefined} />
                <AvatarFallback className="bg-foreground/10 text-foreground text-[10px] font-medium">
                  {nickname.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate">{nickname}</span>
              <span className="text-muted-foreground text-xs">Local</span>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuAction aria-label="Account menu">
                    <MoreHorizontalIcon />
                  </SidebarMenuAction>
                }
              />
              <DropdownMenuContent
                side="top"
                align="end"
                className="w-48 rounded-lg"
              >
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <SettingsIcon className="text-muted-foreground" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
