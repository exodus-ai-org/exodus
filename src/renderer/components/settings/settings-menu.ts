import {
  CloudIcon,
  CogIcon,
  DatabaseIcon,
  HammerIcon,
  HandCoinsIcon,
  InfoIcon,
  KeyboardIcon,
  MemoryStickIcon,
  NetworkIcon,
  ScrollTextIcon,
  TextSearch,
  ShoppingBagIcon,
  TelescopeIcon,
  UserIcon,
  WrenchIcon,
  MousePointer2Icon,
  CircleUserRoundIcon,
  MicIcon,
  CompassIcon
} from 'lucide-react'

export enum SettingsLabel {
  Profile = 'Profile',
  General = 'General',
  Personality = 'Personality',
  AiProviders = 'AI Providers',
  AmazonS3 = 'AWS S3',
  McpServers = 'MCP Servers',
  SkillsMarket = 'Skills Market',
  FullTextSearch = 'Full Text Search',
  KnowledgeBase = 'Knowledge Base',
  BuiltinTools = 'Built-in Tools',
  Memory = 'Memory',
  Discover = 'Discover',
  Voice = 'Voice',
  DeepResearch = 'Deep Research',
  ComputerUse = 'Computer Use',
  DataControls = 'Data Controls',
  Logger = 'Logger',
  KeyboardShortcuts = 'Keyboard Shortcuts',
  AboutExodus = 'About Exodus'
}

export type SettingsPage = SettingsLabel

// Flat menu — every entry is a top-level page. The content-side Cards provide
// the visual grouping, so the sidebar has no expandable second level. The final
// group has no label — it holds "About Exodus", pinned to the bottom.
export const menus = {
  navMain: [
    {
      label: 'Personal',
      items: [
        { title: SettingsLabel.General, icon: CogIcon },
        { title: SettingsLabel.Profile, icon: CircleUserRoundIcon },
        { title: SettingsLabel.Personality, icon: UserIcon },
        { title: SettingsLabel.Memory, icon: MemoryStickIcon },
        { title: SettingsLabel.Discover, icon: CompassIcon },
        { title: SettingsLabel.Voice, icon: MicIcon },
        { title: SettingsLabel.KeyboardShortcuts, icon: KeyboardIcon }
      ]
    },
    {
      label: 'AI & Tools',
      items: [
        { title: SettingsLabel.AiProviders, icon: HandCoinsIcon },
        { title: SettingsLabel.BuiltinTools, icon: WrenchIcon },
        { title: SettingsLabel.DeepResearch, icon: TelescopeIcon }
      ]
    },
    {
      // External, connection-backed capabilities: search backends, the
      // knowledge base, the computer-use sandbox, MCP connectors, the skills
      // marketplace.
      label: 'Integrations',
      items: [
        { title: SettingsLabel.FullTextSearch, icon: TextSearch },
        { title: SettingsLabel.KnowledgeBase, icon: NetworkIcon },
        { title: SettingsLabel.ComputerUse, icon: MousePointer2Icon },
        { title: SettingsLabel.McpServers, icon: HammerIcon },
        { title: SettingsLabel.SkillsMarket, icon: ShoppingBagIcon }
      ]
    },
    {
      // Where the user's data lives and how it moves in and out.
      label: 'Storage',
      items: [
        { title: SettingsLabel.DataControls, icon: DatabaseIcon },
        { title: SettingsLabel.AmazonS3, icon: CloudIcon }
      ]
    },
    {
      label: 'Developer',
      items: [{ title: SettingsLabel.Logger, icon: ScrollTextIcon }]
    },
    {
      label: '',
      items: [{ title: SettingsLabel.AboutExodus, icon: InfoIcon }]
    }
  ]
}
