import { TEST_IDS } from '@shared/constants/test-ids'
import { MessageSquarePlus } from 'lucide-react'
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'
import { sileo } from 'sileo'

import {
  ConfigPage,
  ConversationList
} from '@/components/philharmonic/chat/conversation-list'
import { GroupChat } from '@/components/philharmonic/chat/group-chat'
import { GroupMembersPanel } from '@/components/philharmonic/chat/group-members-panel'
import { KnowledgeBasePage } from '@/components/philharmonic/knowledge/knowledge-base-page'
import { WorkforcePage } from '@/components/philharmonic/workforce/workforce-page'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useConversationStream } from '@/hooks/use-conversation-stream'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import type { PhilharmonicPage } from '@/layouts/philharmonic-layout'
import { getAgents, getTeams } from '@/services/philharmonic'
import {
  createConversation,
  deleteConversation,
  getConversations,
  updateConversation
} from '@/services/philharmonic-chat'
import type {
  AgentData,
  ConversationData,
  TeamData
} from '@/stores/philharmonic'

const CostAnalysis = lazy(() =>
  import('@/components/philharmonic/cost-analysis').then((m) => ({
    default: m.CostAnalysis
  }))
)

const ScheduleTab = lazy(() =>
  import('@/components/philharmonic/schedule/schedule-tab').then((m) => ({
    default: m.ScheduleTab
  }))
)

export function PhilharmonicContainer({
  activePage,
  onNavigate
}: {
  activePage: PhilharmonicPage
  onNavigate: (p: PhilharmonicPage) => void
}) {
  const [conversations, setConversations] = useState<ConversationData[]>([])
  const [employees, setEmployees] = useState<AgentData[]>([])
  const [teams, setTeams] = useState<TeamData[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const isFullscreen = useIsFullscreen()

  useEffect(() => {
    getConversations().then((cs) => {
      setConversations(cs)
      setActiveId((cur) => cur ?? cs[0]?.id ?? null)
    })
    getAgents().then(setEmployees)
    getTeams().then(setTeams)
  }, [])

  const agentsById = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees]
  )
  const teamsById = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])),
    [teams]
  )

  const handleCreate = useCallback(async () => {
    const conv = await createConversation({ title: 'New group' })
    setConversations((p) => [{ ...conv, latestMessage: null }, ...p])
    setActiveId(conv.id)
    onNavigate('chat')
  }, [onNavigate])

  const handleSelect = useCallback(
    (id: string) => {
      setActiveId(id)
      onNavigate('chat')
    },
    [onNavigate]
  )

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteConversation(id)
      setConversations((p) => p.filter((c) => c.id !== id))
      setActiveId((cur) => (cur === id ? null : cur))
      sileo.success({ title: 'Group deleted' })
    } catch (err) {
      sileo.error({
        title: 'Could not delete the group',
        description: err instanceof Error ? err.message : String(err)
      })
    }
  }, [])

  const handleRename = useCallback(async (id: string, title: string) => {
    setConversations((p) => p.map((c) => (c.id === id ? { ...c, title } : c)))
    await updateConversation(id, { title })
  }, [])

  const handleNavigateConfig = useCallback(
    (page: ConfigPage) => onNavigate(page),
    [onNavigate]
  )

  const activeConv = conversations.find((c) => c.id === activeId)
  const members = (activeConv?.memberAgentIds ?? []).flatMap((id) => {
    const agent = agentsById[id]
    return agent ? [agent] : []
  }) as AgentData[]

  // Single SSE subscription per Group, hoisted here so the Members panel and
  // the chat both read from the same aggregated state.
  const stream = useConversationStream(activeId)

  // Main column content varies by activePage; sidebar stays put on every page.
  const mainContent = (() => {
    if (activePage === 'workforce') return <WorkforcePage />
    if (activePage === 'knowledge') return <KnowledgeBasePage />
    if (activePage === 'dashboard')
      return (
        <Tabs defaultValue="costs" className="flex h-full min-h-0 flex-col">
          <TabsList className="mx-4 mt-3 w-fit shrink-0">
            <TabsTrigger value="costs">Costs</TabsTrigger>
            <TabsTrigger value="schedule" data-testid={TEST_IDS.schedule.tab}>
              Schedule
            </TabsTrigger>
          </TabsList>
          <TabsContent value="costs" className="min-h-0 flex-1">
            <Suspense fallback={null}>
              <CostAnalysis />
            </Suspense>
          </TabsContent>
          <TabsContent value="schedule" className="min-h-0 flex-1">
            <Suspense fallback={null}>
              <ScheduleTab conversations={conversations} />
            </Suspense>
          </TabsContent>
        </Tabs>
      )
    // chat
    if (activeConv) {
      return (
        <GroupChat
          conversation={activeConv}
          agentsById={agentsById}
          teamsById={teamsById}
          members={members}
          stream={stream}
          onRename={handleRename}
        />
      )
    }
    return (
      <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <MessageSquarePlus className="h-12 w-12 opacity-30" />
        <div className="text-foreground text-sm font-medium">
          No group selected
        </div>
        <div className="max-w-xs text-xs">
          Pick a group from the left, or start a new one to message your virtual
          team.
        </div>
        <Button size="sm" onClick={handleCreate}>
          Create a group
        </Button>
      </div>
    )
  })()

  // Members panel only appears alongside an active chat conversation.
  const showMembers = activePage === 'chat' && activeConv != null

  return (
    <div
      className="grid h-full min-h-0 w-full bg-(--ph-canvas)"
      style={{
        padding: isFullscreen ? '12px' : '8px',
        gap: '8px',
        gridTemplateColumns: showMembers ? '260px 1fr 260px' : '260px 1fr',
        transition: 'grid-template-columns 180ms cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div className="min-h-0 min-w-0 overflow-hidden rounded-(--ph-radius-xl) bg-(--ph-surface) shadow-(--ph-shadow-card)">
        <ConversationList
          conversations={conversations}
          agentsById={agentsById}
          activeId={activeId}
          activePage={activePage}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onDelete={handleDelete}
          onNavigateConfig={handleNavigateConfig}
        />
      </div>
      <div className="min-h-0 min-w-0 overflow-hidden rounded-(--ph-radius-xl) bg-(--ph-surface) shadow-(--ph-shadow-card)">
        {mainContent}
      </div>
      {showMembers && (
        <div
          className="min-h-0 min-w-0 overflow-hidden rounded-(--ph-radius-xl) bg-(--ph-surface) shadow-(--ph-shadow-card)"
          style={{ animation: 'ph-fade-in 180ms ease-out' }}
        >
          <GroupMembersPanel
            members={members}
            teamsById={teamsById}
            busyAgents={stream.busyAgents}
          />
        </div>
      )}
    </div>
  )
}
