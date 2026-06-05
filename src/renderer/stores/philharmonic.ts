import type { Attachment } from '@shared/types/chat'
import type { ConversationMessageRole } from '@shared/types/philharmonic'
import { atom } from 'jotai'

/**
 * Pending attachments for the next user message in the Group composer. Lives
 * separately from Chat's `attachmentAtom` so the two surfaces never share
 * state (data-isolation rule for Philharmonic). Cleared on send and on
 * conversation switch by the composer.
 */
export const philharmonicAttachmentAtom = atom<Attachment[]>([])

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
  // NULL means the doc is "General" — visible to every Group.
  teamId: string | null
  createdAt: string
  updatedAt: string
}
