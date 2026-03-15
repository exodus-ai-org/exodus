import { AiProviders } from '@shared/types/ai'
import {
  ChromeIcon,
  CogIcon,
  ComputerIcon,
  DatabaseIcon,
  FileUpIcon,
  HammerIcon,
  HandCoinsIcon,
  InfoIcon,
  MemoryStickIcon,
  WrenchIcon
} from 'lucide-react'

export enum SettingLabel {
  General = 'General',
  AiProviders = 'AI Providers',
  AmazonS3 = 'Amazon S3',
  McpServers = 'MCP Servers',
  BuiltinTools = 'Built-in Tools',
  MemoryLayer = 'Memory Layer',
  AudioAndSpeech = 'Audio and Speech',
  ImageGeneration = 'Image Generation',
  WebSearch = 'Web Search',
  GoogleMaps = 'Google Maps',
  DeepResearch = 'Deep Research',
  Rag = 'RAG',
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
      title: SettingLabel.AmazonS3,
      icon: FileUpIcon
    },
    {
      icon: HammerIcon,
      title: SettingLabel.McpServers
    },
    {
      icon: WrenchIcon,
      title: SettingLabel.BuiltinTools,
      items: [
        { title: SettingLabel.WebSearch },
        { title: SettingLabel.GoogleMaps },
        { title: SettingLabel.ImageGeneration },
        { title: SettingLabel.DeepResearch },
        { title: SettingLabel.AudioAndSpeech },
        { title: SettingLabel.Rag }
      ]
    },
    {
      icon: MemoryStickIcon,
      title: SettingLabel.MemoryLayer
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
      icon: DatabaseIcon,
      title: SettingLabel.DataControls
    },
    {
      icon: InfoIcon,
      title: SettingLabel.AboutExodus
    }
  ]
}
