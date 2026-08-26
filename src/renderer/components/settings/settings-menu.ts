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
        { title: SettingsLabel.Personality, icon: UserIcon },
        { title: SettingsLabel.AboutExodus, icon: InfoIcon }
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
      label: 'Capabilities',
      items: [
        {
          icon: WrenchIcon,
          title: SettingsLabel.BuiltinTools,
          items: [
            { title: SettingsLabel.WebSearch },
            { title: SettingsLabel.GoogleMaps },
            { title: SettingsLabel.ImageGeneration },
            { title: SettingsLabel.DeepResearch }
          ]
        },
        { icon: SearchIcon, title: SettingsLabel.Search },
        { icon: NetworkIcon, title: SettingsLabel.GraphRag },
        { icon: GlobeIcon, title: SettingsLabel.BrowserUse },
        { icon: ComputerIcon, title: SettingsLabel.ComputerUse },
        { icon: MemoryStickIcon, title: SettingsLabel.MemoryLayer }
      ]
    },
    {
      label: 'Integrations',
      items: [
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
        { icon: KeyboardIcon, title: SettingsLabel.KeyboardShortcuts }
      ]
    }
  ]
}
