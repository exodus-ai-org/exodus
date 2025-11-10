import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { isSettingsVisibleAtom } from '@/stores/settings'
import { useSetAtom } from 'jotai'
import { AtomIcon, SettingsIcon, StoreIcon, WorkflowIcon } from 'lucide-react'
import React from 'react'
import { useLocation, useNavigate } from 'react-router'

export function NavFooter({
  ...props
}: React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const setSettingsDialogVisible = useSetAtom(isSettingsVisibleAtom)
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <StoreIcon />
              MCP Store
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <AtomIcon />
              RAG
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={location.pathname.includes('workflow')}
              onClick={() => navigate('/workflow')}
            >
              <WorkflowIcon />
              Workflow
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setSettingsDialogVisible(true)}>
              <SettingsIcon />
              Settings
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
