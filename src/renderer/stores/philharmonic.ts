import type { ConversationMessageRole } from '@shared/types/philharmonic'

export interface AgentData {
  id: string
  name: string
  description: string | null
  teamId: string | null
  avatarSeed: string | null
  avatarStyle: string | null
  systemPrompt: string | null
  toolAllowList: string[] | null
  skillSlugs: string[] | null
  mcpServerNames: string[] | null
  model: string | null
  provider: string | null
  isActive: boolean | null
  createdAt: string
  updatedAt: string
}

export interface TeamData {
  id: string
  name: string
  description: string | null
  systemPrompt: string | null
  icon: string | null
  createdAt: string
  updatedAt: string
}

export interface ConversationData {
  id: string
  title: string
  icon: string | null
  memberAgentIds: string[] | null
  archived: boolean | null
  createdAt: string
  updatedAt: string
  lastMessageAt: string
  latestMessage: {
    role: 'user' | 'pm' | 'employee' | 'system'
    content: string
    agentId: string | null
    createdAt: string
  } | null
}

export interface ConversationMessageData {
  id: string
  conversationId: string
  role: ConversationMessageRole
  agentId: string | null
  content: string
  parts: Record<string, unknown>[] | null
  taskId: string | null
  createdAt: string
}

export interface KnowledgeDocData {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}
