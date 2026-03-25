import type { Chat, Project } from '@shared/types/db'
import { useSetAtom } from 'jotai'
import {
  ChevronRightIcon,
  FolderPlusIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SquarePenIcon,
  Trash2Icon
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import useSWR from 'swr'

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
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { createProject, deleteProject } from '@/services/project'
import { openTabsAtom } from '@/stores/chat'

function ProjectChats({ projectId }: { projectId: string }) {
  const { id: currentChatId } = useParams<{ id: string }>()
  const { data: chats } = useSWR<Chat[]>(
    `/api/history?projectId=${projectId}`,
    { fallbackData: [] }
  )
  const setOpenTabs = useSetAtom(openTabsAtom)

  return (
    <SidebarMenu className="gap-0.5 pl-2">
      {chats?.map((chat) => (
        <SidebarMenuItem key={chat.id} className="h-7">
          <SidebarMenuButton
            isActive={chat.id === currentChatId}
            className="text-xs"
            render={
              <Link
                to={`/chat/${chat.id}`}
                onClick={() =>
                  setOpenTabs((prev) =>
                    prev.find((t) => t.id === chat.id)
                      ? prev
                      : [...prev, { id: chat.id, title: chat.title }]
                  )
                }
              />
            }
          >
            <span className="min-w-0 flex-1 truncate">{chat.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
      <SidebarMenuItem className="h-7">
        <SidebarMenuButton
          className="text-muted-foreground text-xs"
          render={<Link to={`/?projectId=${projectId}`} />}
        >
          <PlusIcon size={12} />
          <span>New chat</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function NavProjects() {
  const { data: projects, isLoading } = useSWR<Project[]>('/api/project', {
    fallbackData: []
  })
  const navigate = useNavigate()

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [toBeDeletedProject, setToBeDeletedProject] = useState<Project | null>(
    null
  )

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    const project = await createProject({ name: newProjectName.trim() })
    setNewProjectName('')
    setShowCreateDialog(false)
    if (project) {
      navigate(`/project/${project.id}`)
    }
  }

  const handleDeleteProject = async () => {
    if (!toBeDeletedProject) return
    await deleteProject(toBeDeletedProject)
    setToBeDeletedProject(null)
  }

  if (isLoading) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="text-muted-foreground px-2 text-sm">Loading...</div>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel className="flex items-center justify-between pr-2">
          Projects
          <button
            onClick={() => setShowCreateDialog(true)}
            className="hover:text-foreground text-muted-foreground transition-colors"
          >
            <FolderPlusIcon size={14} />
          </button>
        </SidebarGroupLabel>
        <SidebarGroupContent>
          {projects?.length === 0 ? (
            <div className="text-muted-foreground px-2 py-4 text-center text-xs">
              No projects yet. Create one to organize your chats.
            </div>
          ) : (
            <SidebarMenu className="gap-1">
              {projects?.map((project) => (
                <Collapsible key={project.id} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger className="w-full">
                      <SidebarMenuButton>
                        <ChevronRightIcon
                          size={14}
                          className="shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                        />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {project.name}
                        </span>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <SidebarMenuAction showOnHover>
                          <MoreHorizontalIcon />
                        </SidebarMenuAction>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="w-48 rounded-lg"
                        side="right"
                        align="start"
                      >
                        <DropdownMenuItem
                          onClick={() => navigate(`/project/${project.id}`)}
                        >
                          <SquarePenIcon className="text-muted-foreground" />
                          <span>Edit project</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setToBeDeletedProject(project)}
                        >
                          <Trash2Icon className="text-destructive" />
                          <span className="text-destructive">Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <CollapsibleContent>
                      <ProjectChats projectId={project.id} />
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          )}
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Project name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
            autoFocus
          />
          <DialogFooter>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim()}
              size="sm"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!toBeDeletedProject}
        onOpenChange={(open) => !open && setToBeDeletedProject(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{toBeDeletedProject?.name}
              &quot; and all its chats. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
