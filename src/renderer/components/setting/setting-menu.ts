import { AiProviders } from '@shared/types/ai'
import {
  AtomIcon,
  AudioWaveformIcon,
  ChromeIcon,
  CogIcon,
  ComputerIcon,
  DatabaseIcon,
  FileUpIcon,
  GlobeIcon,
  HammerIcon,
  HandCoinsIcon,
  ImageIcon,
  InfoIcon,
  MapIcon,
  MemoryStickIcon,
  TelescopeIcon,
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
      title: SettingLabel.BuiltinTools
    },
    {
      icon: MemoryStickIcon,
      title: SettingLabel.MemoryLayer
    },
    {
      icon: AudioWaveformIcon,
      title: SettingLabel.AudioAndSpeech
    },
    {
      icon: ImageIcon,
      title: SettingLabel.ImageGeneration
    },
    {
      icon: GlobeIcon,
      title: SettingLabel.WebSearch
    },
    {
      icon: MapIcon,
      title: SettingLabel.GoogleMaps
    },
    {
      icon: TelescopeIcon,
      title: SettingLabel.DeepResearch
    },
    {
      icon: AtomIcon,
      title: SettingLabel.Rag
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
