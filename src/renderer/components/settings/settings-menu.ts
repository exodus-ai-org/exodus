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
      title: SettingsLabel.General,
      icon: CogIcon
    },
    {
      title: SettingsLabel.Personality,
      icon: UserIcon
    },
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
    },
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
    {
      icon: AudioLinesIcon,
      title: SettingsLabel.AudioAndSpeech
    },
    {
      icon: MemoryStickIcon,
      title: SettingsLabel.MemoryLayer
    },
    {
      icon: ShoppingBagIcon,
      title: SettingsLabel.SkillsMarket
    },
    {
      icon: PlugIcon,
      title: SettingsLabel.McpServers
    },
    {
      icon: NetworkIcon,
      title: SettingsLabel.GraphRag
    },
    {
      icon: GlobeIcon,
      title: SettingsLabel.BrowserUse
    },
    {
      icon: ComputerIcon,
      title: SettingsLabel.ComputerUse
    },
    {
      icon: DatabaseIcon,
      title: SettingsLabel.DataControls,
      items: [{ title: SettingsLabel.AmazonS3 }]
    },
    {
      icon: ScrollTextIcon,
      title: SettingsLabel.Logger
    },
    {
      icon: KeyboardIcon,
      title: SettingsLabel.KeyboardShortcuts
    },
    {
      icon: InfoIcon,
      title: SettingsLabel.AboutExodus
    }
  ]
}
