import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import {
  AtomIcon,
  SettingsIcon,
  SparklesIcon,
  WorkflowIcon
} from 'lucide-react'
import React from 'react'
import { useLocation, useNavigate } from 'react-router'

export function NavFooter({
  ...props
}: React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={location.pathname.includes('skills-market')}
              onClick={() => navigate('/skills-market')}
            >
              <SparklesIcon />
              Skills Market
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
            <SidebarMenuButton
              isActive={location.pathname.includes('settings')}
              onClick={() => navigate('/settings')}
            >
              <SettingsIcon />
              Setting
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
