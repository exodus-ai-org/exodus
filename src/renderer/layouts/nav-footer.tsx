import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { isSettingsVisibleAtom } from '@/stores/settings'
import { useSetAtom } from 'jotai'
import { Folders, Settings } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router'

export function NavFooter({
  ...props
}: React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const setSettingsDialogVisible = useSetAtom(isSettingsVisibleAtom)

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/file-system">
                <Folders />
                File System
              </Link>
            </SidebarMenuButton>
            <SidebarMenuButton
              onClick={() => setSettingsDialogVisible(true)}
              className="cursor-pointer"
            >
              <Settings />
              Settings
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
