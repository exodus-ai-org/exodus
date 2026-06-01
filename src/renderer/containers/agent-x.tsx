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
} from '@/components/agent-x/chat/conversation-list'
import { GroupChat } from '@/components/agent-x/chat/group-chat'
import { GroupMembersPanel } from '@/components/agent-x/chat/group-members-panel'
import { KnowledgeBasePage } from '@/components/agent-x/knowledge/knowledge-base-page'
import { WorkforcePage } from '@/components/agent-x/workforce/workforce-page'
import { Button } from '@/components/ui/button'
import type { AgentXPage } from '@/layouts/agent-x-layout'
import { getAgents, getTeams } from '@/services/agent-x'
import {
  createConversation,
  deleteConversation,
  getConversations,
  updateConversation
} from '@/services/agent-x-chat'
import type { AgentData, ConversationData, TeamData } from '@/stores/agent-x'

const CostAnalysis = lazy(() =>
  import('@/components/agent-x/cost-analysis').then((m) => ({
    default: m.CostAnalysis
  }))
)

export function AgentXContainer({
  activePage,
  onNavigate
}: {
  activePage: AgentXPage
  onNavigate: (p: AgentXPage) => void
}) {
  const [conversations, setConversations] = useState<ConversationData[]>([])
  const [employees, setEmployees] = useState<AgentData[]>([])
  const [teams, setTeams] = useState<TeamData[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

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
  const members = (activeConv?.memberAgentIds ?? [])
    .map((id) => agentsById[id])
    .filter(Boolean) as AgentData[]

  // Main column content varies by activePage; sidebar stays put on every page.
  const mainContent = (() => {
    if (activePage === 'workforce') return <WorkforcePage />
    if (activePage === 'knowledge') return <KnowledgeBasePage />
    if (activePage === 'dashboard')
      return (
        <Suspense fallback={null}>
          <CostAnalysis />
        </Suspense>
      )
    // chat
    if (activeConv) {
      return (
        <GroupChat
          conversation={activeConv}
          agentsById={agentsById}
          teamsById={teamsById}
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
      className="grid h-full min-h-0 w-full"
      style={{
        gridTemplateColumns: showMembers ? '260px 1fr 260px' : '260px 1fr'
      }}
    >
      <div className="min-h-0 min-w-0 border-r">
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
      <div className="min-h-0 min-w-0 overflow-hidden">{mainContent}</div>
      {showMembers && (
        <div className="min-h-0 min-w-0 border-l">
          <GroupMembersPanel
            members={members}
            teamsById={teamsById}
            busyAgentIds={new Set()}
          />
        </div>
      )}
    </div>
  )
}
