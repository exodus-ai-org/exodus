import { fetcher } from '@exodus/shared/utils/http'
import { sileo } from 'sileo'
import { mutate } from 'swr'

import { i18n } from '@/lib/i18n'
import type { Project } from '@/types/db'

interface CreateProjectInput {
  name: string
  description?: string
  instructions?: string
  structuredInstructions?: {
    tone?: string
    role?: string
    responseFormat?: string
    constraints?: string
  }
}
type UpdateProjectInput = Partial<CreateProjectInput>

export const getProjects = () => fetcher<Project[]>('/api/project')

export const getProject = (id: string) =>
  fetcher<Project & { chatCount: number }>(`/api/project/${id}`)

export const createProject = async (data: CreateProjectInput) => {
  const project = await fetcher<Project>('/api/project', {
    method: 'POST',
    body: data as never
  })

  mutate('/api/project')
  sileo.success({ title: i18n.t('chat:projectDetail.toast.createdTitle') })
  return project
}

export const updateProject = async (id: string, data: UpdateProjectInput) => {
  const project = await fetcher<Project>(`/api/project/${id}`, {
    method: 'PUT',
    body: data as never
  })

  mutate('/api/project')
  mutate(`/api/project/${id}`)
  sileo.success({ title: i18n.t('chat:projectDetail.toast.updatedTitle') })
  return project
}

export const deleteProject = async (project: Project) => {
  await fetcher<void>(`/api/project/${project.id}`, {
    method: 'DELETE'
  })

  mutate('/api/project')
  sileo.success({
    title: i18n.t('chat:projectDetail.toast.deletedTitle'),
    description: project.name
  })
}
