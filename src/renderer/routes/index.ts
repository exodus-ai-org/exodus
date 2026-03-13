import { ChatDetail } from '@/containers/chat-detail'
import { Home } from '@/containers/home'
import { SkillsMarket } from '@/containers/skills-market'
import { Workflow } from '@/containers/workflow'
import { Layout as ChatLayout } from '@/layouts/chat-layout'
import { SettingsLayout } from '@/layouts/settings-layout'
import { Layout as WorkspaceLayout } from '@/layouts/workspace-layout'
import { createHashRouter } from 'react-router'

export const router = createHashRouter([
  { path: '/settings', Component: SettingsLayout },

  {
    Component: ChatLayout,
    children: [
      { path: '/', Component: Home },
      { path: '/chat/:id', Component: ChatDetail },
      { path: '/skills-market', Component: SkillsMarket }
    ]
  },

  {
    Component: WorkspaceLayout,
    children: [
      { path: '/workflow', Component: Workflow },
      { path: '/mcp-store', Component: Workflow },
      { path: '/rag', Component: Workflow }
    ]
  }
])
