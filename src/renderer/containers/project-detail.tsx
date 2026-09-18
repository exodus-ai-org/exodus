import type { StructuredInstructions } from '@shared/schemas/project-schema'
import type { Chat, Project } from '@shared/types/db'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import useSWR from 'swr'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { updateProject } from '@/services/project'

export function ProjectDetail() {
  const { t } = useTranslation('chat')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: project, mutate: mutateProject } = useSWR<
    Project & { chatCount: number }
  >(id ? `/api/project/${id}` : null)
  const { data: chats } = useSWR<Chat[]>(
    id ? `/api/history?projectId=${id}` : null,
    { fallbackData: [] }
  )

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [useStructured, setUseStructured] = useState(false)
  const [structured, setStructured] = useState<StructuredInstructions>({})
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (!project) return
    setName(project.name)
    setDescription(project.description ?? '')
    setInstructions(project.instructions ?? '')
    const si = project.structuredInstructions
    if (si && Object.values(si).some(Boolean)) {
      setUseStructured(true)
      setStructured(si)
    }
  }, [project])

  const handleSave = async () => {
    if (!id) return
    await updateProject(id, {
      name,
      description: description || undefined,
      instructions: instructions || undefined,
      structuredInstructions: useStructured ? structured : undefined
    })
    mutateProject()
    setIsDirty(false)
  }

  const handleNewChat = () => {
    navigate(`/?projectId=${id}`)
  }

  if (!project) return null

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setIsDirty(true)
          }}
          className="border-none bg-transparent text-2xl font-bold shadow-none focus-visible:ring-0"
          placeholder={t('projectDetail.namePlaceholder')}
        />
        <Input
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            setIsDirty(true)
          }}
          className="text-muted-foreground border-none bg-transparent shadow-none focus-visible:ring-0"
          placeholder={t('projectDetail.descriptionPlaceholder')}
        />
      </div>

      {isDirty && (
        <div className="mb-4 flex justify-end">
          <Button onClick={handleSave} size="sm">
            {t('projectDetail.saveChanges')}
          </Button>
        </div>
      )}

      <Tabs defaultValue="chats">
        <TabsList>
          <TabsTrigger value="chats">
            {t('projectDetail.tabs.chats', { count: chats?.length ?? 0 })}
          </TabsTrigger>
          <TabsTrigger value="instructions">
            {t('projectDetail.tabs.instructions')}
          </TabsTrigger>
          <TabsTrigger value="knowledge" disabled>
            {t('projectDetail.tabs.knowledgeComingSoon')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chats" className="mt-4">
          <div className="mb-4">
            <Button onClick={handleNewChat} variant="outline" size="sm">
              {t('projectDetail.newChatButton')}
            </Button>
          </div>
          {chats?.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('projectDetail.emptyChats')}
            </p>
          ) : (
            <div className="space-y-1">
              {chats?.map((chat) => (
                <Link
                  key={chat.id}
                  to={`/chat/${chat.id}`}
                  className="hover:bg-muted flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors"
                >
                  <span className="truncate">{chat.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(chat.createdAt).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="instructions" className="mt-4 space-y-6">
          <div>
            <Label className="mb-2 block text-sm font-medium">
              {t('projectDetail.customInstructionsLabel')}
            </Label>
            <Textarea
              value={instructions}
              onChange={(e) => {
                setInstructions(e.target.value)
                setIsDirty(true)
              }}
              placeholder={t('projectDetail.instructionsPlaceholder')}
              className="min-h-[120px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={useStructured}
              onCheckedChange={(v) => {
                setUseStructured(v)
                setIsDirty(true)
              }}
            />
            <Label className="text-sm">
              {t('projectDetail.useStructuredLabel')}
            </Label>
          </div>

          {useStructured && (
            <div className="space-y-4 rounded-lg border p-4">
              {(['role', 'tone', 'responseFormat', 'constraints'] as const).map(
                (field) => (
                  <div key={field}>
                    <Label className="mb-1 block text-sm font-medium">
                      {t(`projectDetail.structuredFields.${field}`)}
                    </Label>
                    <Input
                      value={structured[field] ?? ''}
                      onChange={(e) => {
                        setStructured((prev) => ({
                          ...prev,
                          [field]: e.target.value
                        }))
                        setIsDirty(true)
                      }}
                      placeholder={t(
                        `projectDetail.structuredPlaceholders.${field}`
                      )}
                    />
                  </div>
                )
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
