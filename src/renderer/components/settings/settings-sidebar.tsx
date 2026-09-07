import { useAtom } from 'jotai'
import { ArrowLeftIcon, Search } from 'lucide-react'
import { ComponentProps, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import { cn } from '@/lib/utils'
import { settingsLabelAtom } from '@/stores/settings'

import { InputGroup, InputGroupInput, InputGroupAddon } from '../ui/input-group'
import { menus } from './settings-menu'

export function SettingsSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const [active, setActive] = useAtom(settingsLabelAtom)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const isFullscreen = useIsFullscreen()

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return menus.navMain

    return menus.navMain
      .map((group) => ({
        label: group.label,
        items: group.items.filter((item) =>
          item.title.toLowerCase().includes(q)
        )
      }))
      .filter((group) => group.items.length > 0)
  }, [query])

  return (
    <Sidebar {...props} collapsible="none" className="select-none">
      <SidebarHeader
        className={cn(
          'draggable shrink-0 gap-2 px-3 pb-2',
          isFullscreen ? 'pt-2' : 'pt-11'
        )}
      >
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="no-drag text-muted-foreground flex justify-start gap-2"
        >
          <ArrowLeftIcon />
          Back to app
        </Button>

        <InputGroup
          className={cn(
            'no-drag',
            // drop the primitive's default focus-visible ring + border-ring
            'has-[[data-slot=input-group-control]:focus-visible]:border-transparent has-[[data-slot=input-group-control]:focus-visible]:ring-0'
          )}
        >
          <InputGroupInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search settings…"
          />
          <InputGroupAddon align="inline-start">
            <Search />
          </InputGroupAddon>
        </InputGroup>
      </SidebarHeader>
      <SidebarContent className="no-scrollbar gap-1 px-1 pb-2">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="gap-0.5 py-1">
            {group.label && (
              <SidebarGroupLabel className="text-muted-foreground/70 px-2 text-[11px] font-medium tracking-wider uppercase">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarMenu className="gap-0.5">
              {group.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={item.title === active}
                    onClick={() => setActive(item.title)}
                  >
                    {item.icon && <item.icon />}
                    {item.title}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
