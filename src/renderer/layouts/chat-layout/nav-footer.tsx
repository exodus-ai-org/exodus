import { TEST_IDS } from '@shared/constants/test-ids'
import { ChevronsUpDown, SettingsIcon } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { useSettings } from '@/hooks/use-settings'

export function NavFooter({
  ...props
}: React.ComponentProps<typeof SidebarMenu>) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const location = useLocation()
  const { data: settings } = useSettings()

  const onSettings = location.pathname.includes('settings')
  const nickname = settings?.personality?.nickname?.trim() || 'You'
  const initial = nickname.slice(0, 1).toUpperCase()

  return (
    <SidebarMenu {...props}>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full">
            <SidebarMenuButton
              size="lg"
              isActive={onSettings}
              data-testid={TEST_IDS.chatLayout.account}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar size="sm">
                <AvatarImage
                  src={settings?.userAvatar ?? undefined}
                  alt={nickname}
                />
                <AvatarFallback className="rounded-lg">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{nickname}</span>
                <span className="truncate text-xs">
                  {t('state.runOnLocal')}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side="right"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={settings?.userAvatar ?? undefined}
                      alt={nickname}
                    />
                    <AvatarFallback className="rounded-lg">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{nickname}</span>
                    <span className="truncate text-xs">
                      {t('state.runOnLocal')}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                data-testid={TEST_IDS.chatLayout.accountSettings}
                onClick={() => navigate('/settings')}
              >
                <SettingsIcon />
                {t('nav.settings')}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            {/* Future account-menu items (online/offline mode switch, sign
                out) once those features exist — Exodus is local-first with
                no external auth today (see CLAUDE.md), so there's nothing
                to wire these to yet. */}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
