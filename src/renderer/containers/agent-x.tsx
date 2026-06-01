import { MessageSquarePlus } from 'lucide-react'
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'

import { ConversationList } from '@/components/agent-x/chat/conversation-list'
import { GroupChat } from '@/components/agent-x/chat/group-chat'
import { GroupMembersPanel } from '@/components/agent-x/chat/group-members-panel'
import { EmployeesPage } from '@/components/agent-x/employees/employees-page'
import { KnowledgeBasePage } from '@/components/agent-x/knowledge/knowledge-base-page'
import { TeamsPage } from '@/components/agent-x/teams/teams-page'
import { Button } from '@/components/ui/button'
import type { AgentXPage } from '@/layouts/agent-x-layout'
import { getAgents, getTeams } from '@/services/agent-x'
import {
  createConversation,
  deleteConversation,
  getConversations
} from '@/services/agent-x-chat'
import type { AgentData, ConversationData, TeamData } from '@/stores/agent-x'

const CostAnalysis = lazy(() =>
  import('@/components/agent-x/cost-analysis').then((m) => ({
    default: m.CostAnalysis
  }))
)

export function AgentXContainer({
  activePage
}: {
  activePage: AgentXPage
  onNavigate?: (p: AgentXPage) => void
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
    // POST /conversations returns the raw row without latestMessage; a fresh
    // group has none anyway, so synthesize null here so types line up.
    setConversations((p) => [{ ...conv, latestMessage: null }, ...p])
    setActiveId(conv.id)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    await deleteConversation(id)
    setConversations((p) => p.filter((c) => c.id !== id))
    setActiveId((cur) => (cur === id ? null : cur))
  }, [])

  const activeConv = conversations.find((c) => c.id === activeId)
  const members = (activeConv?.memberAgentIds ?? [])
    .map((id) => agentsById[id])
    .filter(Boolean) as AgentData[]

  if (activePage === 'chat') {
    return (
      <div className="grid h-full w-full grid-cols-[260px_1fr_260px]">
        <div className="border-r">
          <ConversationList
            conversations={conversations}
            agentsById={agentsById}
            activeId={activeId}
            onSelect={setActiveId}
            onCreate={handleCreate}
            onDelete={handleDelete}
          />
        </div>
        <div className="min-w-0">
          {activeConv ? (
            <GroupChat
              conversation={activeConv}
              agentsById={agentsById}
              teamsById={teamsById}
            />
          ) : (
            <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <MessageSquarePlus className="h-12 w-12 opacity-30" />
              <div className="text-foreground text-sm font-medium">
                No group selected
              </div>
              <div className="max-w-xs text-xs">
                Pick a group from the left, or start a new one to message your
                virtual team.
              </div>
              <Button size="sm" onClick={handleCreate}>
                Create a group
              </Button>
            </div>
          )}
        </div>
        <div className="border-l">
          <GroupMembersPanel
            members={members}
            teamsById={teamsById}
            busyAgentIds={new Set()}
          />
        </div>
      </div>
    )
  }

  if (activePage === 'employees') return <EmployeesPage />
  if (activePage === 'teams') return <TeamsPage />
  if (activePage === 'knowledge') return <KnowledgeBasePage />
  if (activePage === 'costs')
    return (
      <Suspense fallback={null}>
        <CostAnalysis />
      </Suspense>
    )

  // dashboard: simple placeholder for v1
  return <div className="text-muted-foreground p-6 text-sm">Dashboard</div>
}
