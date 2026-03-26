import type { Project } from '@shared/types/db'
import {
  ChevronRightIcon,
  FolderIcon,
  FolderPlusIcon,
  MoreHorizontalIcon,
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
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar'
import { createProject, deleteProject } from '@/services/project'

export function NavProjects() {
  const { data: projects, isLoading } = useSWR<Project[]>('/api/project', {
    fallbackData: []
  })
  const navigate = useNavigate()
  const { id: currentId } = useParams<{ id: string }>()

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

  if (isLoading) return null

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Projects</SidebarGroupLabel>
        <SidebarMenu>
          {/* New project button */}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setShowCreateDialog(true)}>
              <FolderPlusIcon />
              <span>New project</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Each project as a collapsible item */}
          {projects?.map((project) => (
            <Collapsible key={project.id} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger className="w-full">
                  <SidebarMenuButton tooltip={project.name}>
                    <FolderIcon />
                    <span className="min-w-0 flex-1 truncate">
                      {project.name}
                    </span>
                    <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
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
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={currentId === project.id}
                        render={<Link to={`/project/${project.id}`} />}
                      >
                        <span>Project settings</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        render={<Link to={`/?projectId=${project.id}`} />}
                      >
                        <span>New chat</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ))}
        </SidebarMenu>
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
