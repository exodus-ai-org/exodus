import type { Project } from '@shared/types/db'
import { fetcher } from '@shared/utils/http'
import { sileo } from 'sileo'
import { mutate } from 'swr'

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
  sileo.success({ title: 'Project created' })
  return project
}

export const updateProject = async (id: string, data: UpdateProjectInput) => {
  const project = await fetcher<Project>(`/api/project/${id}`, {
    method: 'PUT',
    body: data as never
  })

  mutate('/api/project')
  mutate(`/api/project/${id}`)
  sileo.success({ title: 'Project updated' })
  return project
}

export const deleteProject = async (project: Project) => {
  await fetcher<string>(`/api/project/${project.id}`, {
    method: 'DELETE',
    responseType: 'text'
  })

  mutate('/api/project')
  sileo.success({ title: 'Project deleted', description: project.name })
}
