import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'

interface NavMainItem {
  title: string
  icon: React.ReactNode
  page: string
}

interface NavMainProps {
  items: NavMainItem[]
  activePage: string
  onNavigate: (page: string) => void
}

export function NavMain({ items, activePage, onNavigate }: NavMainProps) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {items.map((item) => (
            <SidebarMenuItem key={item.page}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={activePage === item.page}
                onClick={() => onNavigate(item.page)}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
