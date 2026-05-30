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
import type { AgentXPage } from '@/layouts/agent-x-layout'
import { getAgents } from '@/services/agent-x'
import { createConversation, getConversations } from '@/services/agent-x-chat'
import type { AgentData, ConversationData } from '@/stores/agent-x'

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
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    getConversations().then((cs) => {
      setConversations(cs)
      setActiveId((cur) => cur ?? cs[0]?.id ?? null)
    })
    getAgents().then(setEmployees)
  }, [])

  const agentsById = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees]
  )

  const handleCreate = useCallback(async () => {
    const conv = await createConversation({ title: '新工作群' })
    setConversations((p) => [conv, ...p])
    setActiveId(conv.id)
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
            activeId={activeId}
            onSelect={setActiveId}
            onCreate={handleCreate}
          />
        </div>
        <div className="min-w-0">
          {activeId ? (
            <GroupChat conversationId={activeId} agentsById={agentsById} />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              新建一个工作群开始
            </div>
          )}
        </div>
        <div className="border-l">
          <GroupMembersPanel members={members} busyAgentIds={new Set()} />
        </div>
      </div>
    )
  }

  if (activePage === 'employees') return <EmployeesPage />
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
