import { fetcher } from '@exodus/shared/utils/http'

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

export const getProjects = () => fetcher<Project[]>('/api/v1/project')

export const getProject = (id: string) =>
  fetcher<Project & { chatCount: number }>(`/api/v1/project/${id}`)

export const createProject = (data: CreateProjectInput) =>
  fetcher<Project>('/api/v1/project', { method: 'POST', body: data as never })

export const updateProject = (id: string, data: UpdateProjectInput) =>
  fetcher<Project>(`/api/v1/project/${id}`, {
    method: 'PUT',
    body: data as never
  })

export const deleteProject = (id: string) =>
  fetcher<void>(`/api/v1/project/${id}`, { method: 'DELETE' })
