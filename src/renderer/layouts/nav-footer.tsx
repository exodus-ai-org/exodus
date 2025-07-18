import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { isSettingsVisibleAtom } from '@/stores/settings'
import { useSetAtom } from 'jotai'
import { Settings } from 'lucide-react'
import React from 'react'

export function NavFooter({
  ...props
}: React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const setSettingsDialogVisible = useSetAtom(isSettingsVisibleAtom)

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
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
