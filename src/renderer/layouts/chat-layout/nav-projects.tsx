import {
  FolderIcon,
  FolderPlusIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SquarePenIcon,
  Trash2Icon
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { createProject, deleteProject } from '@/services/project'
import type { Project } from '@/types/db'

export function NavProjects() {
  const { t } = useTranslation(['common', 'chat'])
  const { data: projects, isLoading } = useSWR<Project[]>('/api/v1/project', {
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

  const hasProjects = !!projects && projects.length > 0

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>
          {t('chat:sidebar.projects.title')}
        </SidebarGroupLabel>
        <SidebarGroupAction
          aria-label={t('chat:sidebar.projects.newProject')}
          onClick={() => setShowCreateDialog(true)}
        >
          <PlusIcon />
        </SidebarGroupAction>
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
            {hasProjects ? (
              projects.map((project) => (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton
                    isActive={currentId === project.id}
                    render={<Link to={`/project/${project.id}`} />}
                  >
                    <FolderIcon />
                    <span className="min-w-0 flex-1 truncate">
                      {project.name}
                    </span>
                  </SidebarMenuButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <SidebarMenuAction showOnHover>
                          <MoreHorizontalIcon />
                        </SidebarMenuAction>
                      }
                    />
                    <DropdownMenuContent
                      className="w-48 rounded-lg"
                      side="right"
                      align="start"
                    >
                      <DropdownMenuItem
                        onClick={() => navigate(`/project/${project.id}`)}
                      >
                        <SquarePenIcon className="text-muted-foreground" />
                        <span>{t('chat:sidebar.projects.editProject')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setToBeDeletedProject(project)}
                      >
                        <Trash2Icon className="text-destructive" />
                        <span className="text-destructive">
                          {t('action.delete')}
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ))
            ) : (
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="text-muted-foreground"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <FolderPlusIcon />
                  <span>{t('chat:sidebar.projects.newProject')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('chat:sidebar.projects.createTitle')}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={t('chat:sidebar.projects.namePlaceholder')}
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
              {t('action.create')}
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
            <AlertDialogTitle>
              {t('chat:sidebar.projects.deleteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('chat:sidebar.projects.deleteDescription', {
                name: toBeDeletedProject?.name
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject}>
              {t('action.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
