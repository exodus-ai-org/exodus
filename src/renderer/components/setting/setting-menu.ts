import { AiProviders } from '@shared/types/ai'
import {
  AudioLinesIcon,
  ChromeIcon,
  CogIcon,
  ComputerIcon,
  DatabaseIcon,
  HandCoinsIcon,
  InfoIcon,
  MemoryStickIcon,
  NetworkIcon,
  PlugIcon,
  ShoppingBagIcon,
  WrenchIcon
} from 'lucide-react'

export enum SettingLabel {
  General = 'General',
  AiProviders = 'AI Providers',
  AmazonS3 = 'AWS S3',
  McpServers = 'MCP Servers',
  SkillsMarket = 'Skills Market',
  GraphRag = 'GraphRAG',
  BuiltinTools = 'Built-in Tools',
  MemoryLayer = 'Memory Layer',
  AudioAndSpeech = 'Audio and Speech',
  ImageGeneration = 'Image Generation',
  WebSearch = 'Web Search & Fetch',
  GoogleMaps = 'Google Maps',
  DeepResearch = 'Deep Research',
  BrowserUse = 'Browser Use',
  ComputerUse = 'Computer Use',
  DataControls = 'Data Controls',
  AboutExodus = 'About Exodus'
}

export type SettingPage = SettingLabel | AiProviders

export const menus = {
  navMain: [
    {
      title: SettingLabel.General,
      icon: CogIcon
    },
    {
      title: SettingLabel.AiProviders,
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
      title: SettingLabel.BuiltinTools,
      items: [
        { title: SettingLabel.WebSearch },
        { title: SettingLabel.GoogleMaps },
        { title: SettingLabel.ImageGeneration },
        { title: SettingLabel.DeepResearch }
      ]
    },
    {
      icon: AudioLinesIcon,
      title: SettingLabel.AudioAndSpeech
    },
    {
      icon: MemoryStickIcon,
      title: SettingLabel.MemoryLayer
    },
    {
      icon: ShoppingBagIcon,
      title: SettingLabel.SkillsMarket
    },
    {
      icon: PlugIcon,
      title: SettingLabel.McpServers
    },
    {
      icon: NetworkIcon,
      title: SettingLabel.GraphRag
    },
    {
      icon: DatabaseIcon,
      title: SettingLabel.DataControls,
      items: [{ title: SettingLabel.AmazonS3 }]
    },
    {
      icon: ChromeIcon,
      title: SettingLabel.BrowserUse
    },
    {
      icon: ComputerIcon,
      title: SettingLabel.ComputerUse
    },
    {
      icon: InfoIcon,
      title: SettingLabel.AboutExodus
    }
  ]
}
