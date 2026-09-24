import { fetcher } from '@exodus/shared/utils/http'
import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'
import { sileo } from 'sileo'

import { historyKeys } from '@/hooks/use-chat-history'
import { i18n } from '@/lib/i18n'
import {
  createProject,
  deleteProject,
  getProject,
  getProjects,
  updateProject
} from '@/services/project'
import type { Chat, Project } from '@/types/db'

export const projectKeys = {
  all: ['project'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
  chats: (id: string) => [...projectKeys.all, 'chats', id] as const
}

// `exact`: only the list. Every project's detail and chats sit under the same
// root, and a prefix match would re-GET what is open on screen — a 404 when it
// is the project that was just deleted.
const invalidateProjects = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: projectKeys.all, exact: true })

export function useProjects() {
  const { data, isLoading } = useQuery({
    queryKey: projectKeys.all,
    queryFn: getProjects,
    // exodus-ios and the CLI edit projects through the API; coming back to
    // the window is when the user would look. Off app-wide (settings
    // autosave), on for this list read.
    refetchOnWindowFocus: true
  })
  return { data, isLoading }
}

export function useProject(id: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: projectKeys.detail(id ?? ''),
    queryFn: () => getProject(id!),
    enabled: !!id
  })
  return { data, isLoading }
}

// A filtered read of the history route: its own key, not `historyKeys`.
export function useProjectChats(id: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: projectKeys.chats(id ?? ''),
    queryFn: () => fetcher<Chat[]>(`/api/v1/history?projectId=${id}`),
    enabled: !!id,
    // Same external writers as the unfiltered history list.
    refetchOnWindowFocus: true
  })
  return { data, isLoading }
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createProject>[0]) =>
      createProject(data),
    meta: { errorTitle: i18n.t('errors:generic') },
    onSuccess: () => {
      void invalidateProjects(queryClient)
      sileo.success({ title: i18n.t('chat:projectDetail.toast.createdTitle') })
    }
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data
    }: {
      id: string
      data: Parameters<typeof updateProject>[1]
    }) => updateProject(id, data),
    meta: { errorTitle: i18n.t('errors:generic') },
    onSuccess: (_project, { id }) => {
      void invalidateProjects(queryClient)
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) })
      sileo.success({ title: i18n.t('chat:projectDetail.toast.updatedTitle') })
    }
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (project: Pick<Project, 'id' | 'name'>) =>
      deleteProject(project.id),
    meta: { errorTitle: i18n.t('errors:generic') },
    onSuccess: (_void, project) => {
      void invalidateProjects(queryClient)
      // The project's chats went with it; nothing else refetches the sidebar's
      // list, since refetching on window focus is off.
      void queryClient.invalidateQueries({
        queryKey: historyKeys.all,
        exact: true
      })
      // `inactive`: a query still on screen would be rebuilt and re-fetched
      // (a 404) by its observer's next render.
      for (const queryKey of [
        projectKeys.detail(project.id),
        projectKeys.chats(project.id)
      ]) {
        queryClient.removeQueries({ queryKey, exact: true, type: 'inactive' })
      }
      sileo.success({
        title: i18n.t('chat:projectDetail.toast.deletedTitle'),
        description: project.name
      })
    }
  })
}
