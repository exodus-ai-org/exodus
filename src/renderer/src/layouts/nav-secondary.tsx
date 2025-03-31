import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { settingsDialogVisibleAtom } from '@/stores/setting'
import { useSetAtom } from 'jotai'
import { Folders, Settings } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router'

export function NavSecondary({
  ...props
}: React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const setSettingsDialogVisible = useSetAtom(settingsDialogVisibleAtom)

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/file-system">
                <Folders />
                <span>File System</span>
              </Link>
            </SidebarMenuButton>
            <SidebarMenuButton
              asChild
              onClick={() => setSettingsDialogVisible(true)}
            >
              <div>
                <Settings />
                <span>Settings</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
