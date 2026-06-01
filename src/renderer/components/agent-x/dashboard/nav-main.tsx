import { ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

export interface NavMainChild {
  title: string
  page: string
}

export interface NavMainItem {
  title: string
  icon: React.ReactNode
  /** Leaf node: routes to this page on click. */
  page?: string
  /** Parent node: opens a collapsible group with these children. */
  children?: NavMainChild[]
}

interface NavMainProps {
  items: NavMainItem[]
  activePage: string
  onNavigate: (page: string) => void
}

export function NavMain({ items, activePage, onNavigate }: NavMainProps) {
  // Parents auto-open when one of their children is active; the user can
  // also toggle them manually and the choice is remembered for the session.
  const initialOpen = (): Record<string, boolean> => {
    const o: Record<string, boolean> = {}
    for (const it of items) {
      if (it.children?.some((c) => c.page === activePage)) o[it.title] = true
    }
    return o
  }
  const [openByTitle, setOpenByTitle] =
    useState<Record<string, boolean>>(initialOpen)

  useEffect(() => {
    setOpenByTitle((prev) => {
      const next = { ...prev }
      for (const it of items) {
        if (it.children?.some((c) => c.page === activePage))
          next[it.title] = true
      }
      return next
    })
  }, [activePage, items])

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {items.map((item) => {
            if (!item.children) {
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={activePage === item.page}
                    onClick={() => item.page && onNavigate(item.page)}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            }

            const open = openByTitle[item.title] ?? false
            const childActive = item.children.some((c) => c.page === activePage)
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={childActive && !open}
                  onClick={() =>
                    setOpenByTitle((p) => ({ ...p, [item.title]: !open }))
                  }
                >
                  {item.icon}
                  <span>{item.title}</span>
                  <ChevronRight
                    className={cn(
                      'ml-auto h-4 w-4 transition-transform duration-200',
                      open && 'rotate-90'
                    )}
                  />
                </SidebarMenuButton>
                {open && (
                  <SidebarMenuSub>
                    {item.children.map((child) => (
                      <SidebarMenuSubItem key={child.page}>
                        <SidebarMenuSubButton
                          isActive={activePage === child.page}
                          onClick={() => onNavigate(child.page)}
                        >
                          <span>{child.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
