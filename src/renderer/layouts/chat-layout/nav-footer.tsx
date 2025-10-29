import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { isSettingsVisibleAtom } from '@/stores/settings'
import { useSetAtom } from 'jotai'
import { Atom, Settings, Store, Workflow } from 'lucide-react'
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
              <Store />
              MCP Store
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Atom />
              RAG
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={location.pathname.includes('workflow')}
              onClick={() => navigate('/workflow')}
            >
              <Workflow />
              Workflow
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setSettingsDialogVisible(true)}>
              <Settings />
              Settings
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
