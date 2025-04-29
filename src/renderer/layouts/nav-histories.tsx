import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { BASE_URL } from '@shared/constants'
import type { Chat } from '@shared/types/db'
import { isToday, isYesterday, subMonths, subWeeks } from 'date-fns'
import { ChevronRight, Edit2, MoreHorizontal, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import useSWR, { mutate } from 'swr'
import { Skeleton } from '../components/ui/skeleton'

interface GroupedChats {
  favorite: Chat[]
  today: Chat[]
  yesterday: Chat[]
  lastWeek: Chat[]
  lastMonth: Chat[]
  older: Chat[]
}

export function NavHistorySkeleton() {
  return (
    <section className="flex flex-col gap-3 p-2">
      <Skeleton className="m-2 h-4 w-20" />
      {new Array(10).fill(0).map((_, idx) => (
        <div key={idx} className="flex px-2">
          <Skeleton className="h-5 w-full" />
        </div>
      ))}
    </section>
  )
}

export function NavItems({
  chat,
  className
}: {
  chat: Chat
  className?: string
}) {
  const { id } = useParams<{ id: string }>()
  const { isMobile } = useSidebar()
  const [isOpenRenameDialog, setIsOpenRenameDialog] = useState(false)
  const [chatTitle, setChatTitle] = useState('')

  const updateChat = async (payload: Partial<Chat>) => {
    await fetch(`${BASE_URL}/api/chat`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    mutate('/api/history')
    toast.success(`Succeed to update chat ${payload.id}.`)
  }

  const deleteChat = async (chatId: string) => {
    await fetch(`${BASE_URL}/api/chat/${chatId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    mutate('/api/history')
    if (chatId === id) {
      window.location.href = '/'
    }

    toast.success(`Succeed to delete ${chatId}.`)
  }

  return (
    <>
      <SidebarMenuItem className={className}>
        <SidebarMenuButton asChild isActive={chat.id === id}>
          <Link to={`/chat/${chat.id}`}>
            <span>{chat.title}</span>
          </Link>
        </SidebarMenuButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction showOnHover>
              <MoreHorizontal />
              <span className="sr-only">More</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align={isMobile ? 'end' : 'start'}
          >
            <DropdownMenuItem
              onClick={() =>
                updateChat({ id: chat.id, favorite: !chat.favorite })
              }
            >
              <Star
                className={cn('text-muted-foreground', {
                  ['fill-yellow-500 text-yellow-500']: chat.favorite
                })}
              />
              <span>{chat.favorite ? 'Unfavorite' : 'Favorite'}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setIsOpenRenameDialog(true)
                setChatTitle(chat.title)
              }}
            >
              <Edit2 className="text-muted-foreground" />
              <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => deleteChat(chat.id)}>
              <Trash2 className="text-destructive" />
              <span className="text-destructive hover:text-destructive">
                Delete
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <AlertDialog
        open={isOpenRenameDialog}
        onOpenChange={setIsOpenRenameDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename Chat</AlertDialogTitle>
            <AlertDialogDescription>
              <Input
                className="text-foreground"
                value={chatTitle}
                onChange={(e) => setChatTitle(e.target.value)}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setChatTitle('')
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                updateChat({ id: chat.id, title: chatTitle })
                setIsOpenRenameDialog(false)
                setChatTitle('')
              }}
            >
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function NavHistories() {
  const { data: history, isLoading } = useSWR<Chat[]>('/api/history', {
    fallbackData: []
  })

  const groupChatsByDate = (chats: Chat[]): GroupedChats => {
    const now = new Date()
    const oneWeekAgo = subWeeks(now, 1)
    const oneMonthAgo = subMonths(now, 1)

    const favorite = chats.filter((chat) => chat.favorite)
    const unfavorite = chats.filter((chat) => !chat.favorite)

    const histories = unfavorite.reduce(
      (groups, chat) => {
        const chatDate = new Date(chat.createdAt)

        if (isToday(chatDate)) {
          groups.today.push(chat)
        } else if (isYesterday(chatDate)) {
          groups.yesterday.push(chat)
        } else if (chatDate > oneWeekAgo) {
          groups.lastWeek.push(chat)
        } else if (chatDate > oneMonthAgo) {
          groups.lastMonth.push(chat)
        } else {
          groups.older.push(chat)
        }

        return groups
      },
      {
        favorite: [],
        today: [],
        yesterday: [],
        lastWeek: [],
        lastMonth: [],
        older: []
      } as GroupedChats
    )

    return {
      ...histories,
      favorite
    }
  }

  if (isLoading) {
    return (
      <>
        <NavHistorySkeleton />
        <NavHistorySkeleton />
      </>
    )
  }

  if (history?.length === 0) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="flex w-full flex-row items-center justify-center gap-2 px-2 text-sm text-zinc-500">
            Your conversations will appear here once you start chatting!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <section>
      {history !== undefined &&
        (() => {
          const groupedChats = groupChatsByDate(history)

          return (
            <>
              {groupedChats.favorite.length > 0 && (
                <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                  <SidebarMenu>
                    <Collapsible className="group/collapsible" defaultOpen>
                      <SidebarGroupLabel
                        asChild
                        className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground mb-1 text-sm"
                      >
                        <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between !pl-0">
                          <SidebarGroupLabel>Favorite</SidebarGroupLabel>
                          <ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </CollapsibleTrigger>
                      </SidebarGroupLabel>
                      <CollapsibleContent>
                        {groupedChats.favorite.map((chat) => (
                          <NavItems
                            chat={chat}
                            key={chat.id}
                            className="mb-1 last:mb-0"
                          />
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenu>
                </SidebarGroup>
              )}

              {groupedChats.today.length > 0 && (
                <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                  <SidebarGroupLabel>Today</SidebarGroupLabel>
                  <SidebarMenu>
                    {groupedChats.today.map((chat) => (
                      <NavItems chat={chat} key={chat.id} />
                    ))}
                  </SidebarMenu>
                </SidebarGroup>
              )}

              {groupedChats.yesterday.length > 0 && (
                <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                  <SidebarGroupLabel>Yesterday</SidebarGroupLabel>
                  <SidebarMenu>
                    {groupedChats.yesterday.map((chat) => (
                      <NavItems chat={chat} key={chat.id} />
                    ))}
                  </SidebarMenu>
                </SidebarGroup>
              )}

              {groupedChats.lastWeek.length > 0 && (
                <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                  <SidebarGroupLabel>Last Week</SidebarGroupLabel>
                  <SidebarMenu>
                    {groupedChats.lastWeek.map((chat) => (
                      <NavItems chat={chat} key={chat.id} />
                    ))}
                  </SidebarMenu>
                </SidebarGroup>
              )}

              {groupedChats.lastMonth.length > 0 && (
                <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                  <SidebarGroupLabel>Last Month</SidebarGroupLabel>
                  <SidebarMenu>
                    {groupedChats.lastMonth.map((chat) => (
                      <NavItems chat={chat} key={chat.id} />
                    ))}
                  </SidebarMenu>
                </SidebarGroup>
              )}

              {groupedChats.older.length > 0 && (
                <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                  <SidebarGroupLabel>Older</SidebarGroupLabel>
                  <SidebarMenu>
                    {groupedChats.older.map((chat) => (
                      <NavItems chat={chat} key={chat.id} />
                    ))}
                  </SidebarMenu>
                </SidebarGroup>
              )}
            </>
          )
        })()}
    </section>
  )
}
