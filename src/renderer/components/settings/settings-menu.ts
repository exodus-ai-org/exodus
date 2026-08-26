import { AiProviders } from '@shared/types/ai'
import {
  AudioLinesIcon,
  CogIcon,
  ComputerIcon,
  DatabaseIcon,
  HandCoinsIcon,
  InfoIcon,
  KeyboardIcon,
  MemoryStickIcon,
  NetworkIcon,
  PlugIcon,
  ScrollTextIcon,
  SearchIcon,
  ShoppingBagIcon,
  UserIcon,
  GlobeIcon,
  WrenchIcon
} from 'lucide-react'

export enum SettingsLabel {
  General = 'General',
  Personality = 'Personality',
  AiProviders = 'AI Providers',
  AmazonS3 = 'AWS S3',
  McpServers = 'MCP Servers',
  SkillsMarket = 'Skills Market',
  Search = 'Search',
  GraphRag = 'GraphRAG',
  BuiltinTools = 'Built-in Tools',
  MemoryLayer = 'Memory Layer',
  AudioAndSpeech = 'Audio and Speech',
  ImageGeneration = 'Image Generation',
  WebSearch = 'Web Search',
  GoogleMaps = 'Google Maps',
  DeepResearch = 'Deep Research',
  BrowserUse = 'Browser Use',
  ComputerUse = 'Computer Use',
  DataControls = 'Data Controls',
  Logger = 'Logger',
  KeyboardShortcuts = 'Keyboard Shortcuts',
  AboutExodus = 'About Exodus'
}

export type SettingsPage = SettingsLabel | AiProviders

export const menus = {
  navMain: [
    {
      label: 'General',
      items: [
        { title: SettingsLabel.General, icon: CogIcon },
        {
          title: SettingsLabel.BuiltinTools,
          icon: WrenchIcon,
          items: [
            { title: SettingsLabel.WebSearch },
            { title: SettingsLabel.GoogleMaps },
            { title: SettingsLabel.ImageGeneration },
            { title: SettingsLabel.DeepResearch }
          ]
        }
      ]
    },
    {
      label: 'AI & Providers',
      items: [
        {
          title: SettingsLabel.AiProviders,
          icon: HandCoinsIcon,
          items: [
            { title: AiProviders.OpenAiGpt },
            { title: AiProviders.AzureOpenAi },
            { title: AiProviders.AnthropicClaude },
            { title: AiProviders.GoogleGemini },
            { title: AiProviders.XaiGrok },
            { title: AiProviders.Ollama }
          ]
        }
      ]
    },
    {
      label: 'Personalization',
      items: [
        { title: SettingsLabel.Personality, icon: UserIcon },
        { icon: MemoryStickIcon, title: SettingsLabel.MemoryLayer }
      ]
    },
    {
      // External, connection-backed capabilities — the home for anything
      // that talks to an outside service or environment (search backend,
      // GraphRAG, browser/computer-use sandboxes, MCP connectors, the
      // skills marketplace). Future integrations (GitHub, Google
      // Workspace, etc.) belong here too.
      label: 'Plugin',
      items: [
        { icon: SearchIcon, title: SettingsLabel.Search },
        { icon: NetworkIcon, title: SettingsLabel.GraphRag },
        { icon: GlobeIcon, title: SettingsLabel.BrowserUse },
        { icon: ComputerIcon, title: SettingsLabel.ComputerUse },
        { icon: PlugIcon, title: SettingsLabel.McpServers },
        { icon: ShoppingBagIcon, title: SettingsLabel.SkillsMarket }
      ]
    },
    {
      label: 'Data & Privacy',
      items: [
        {
          icon: DatabaseIcon,
          title: SettingsLabel.DataControls,
          items: [{ title: SettingsLabel.AmazonS3 }]
        },
        { icon: ScrollTextIcon, title: SettingsLabel.Logger }
      ]
    },
    {
      label: 'Preferences',
      items: [
        { icon: AudioLinesIcon, title: SettingsLabel.AudioAndSpeech },
        { icon: KeyboardIcon, title: SettingsLabel.KeyboardShortcuts },
        { icon: InfoIcon, title: SettingsLabel.AboutExodus }
      ]
    }
  ]
}
