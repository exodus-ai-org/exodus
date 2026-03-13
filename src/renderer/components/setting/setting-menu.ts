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
  // ARCHIVED: HammerIcon,
  HandCoinsIcon,
  ImageIcon,
  InfoIcon,
  MapIcon,
  MemoryStickIcon,
  PaletteIcon,
  TelescopeIcon,
  WrenchIcon
} from 'lucide-react'

export const menus = {
  navMain: [
    {
      title: 'General',
      icon: CogIcon
    },
    {
      title: 'AI Providers',
      icon: HandCoinsIcon,
      items: [
        {
          title: AiProviders.OpenAiGpt
        },
        {
          title: AiProviders.AzureOpenAi
        },
        {
          title: AiProviders.AnthropicClaude
        },
        {
          title: AiProviders.GoogleGemini
        },
        {
          title: AiProviders.XaiGrok
        },
        {
          title: AiProviders.Ollama
        }
      ]
    },
    {
      title: 'Amazon S3',
      icon: FileUpIcon
    },
    // ARCHIVED: { icon: HammerIcon, title: 'MCP Servers' },
    {
      icon: WrenchIcon,
      title: 'Tools'
    },
    {
      icon: MemoryStickIcon,
      title: 'Memory Layer'
    },
    {
      icon: AudioWaveformIcon,
      title: 'Audio and Speech'
    },
    {
      icon: ImageIcon,
      title: 'Image Generation'
    },
    {
      icon: GlobeIcon,
      title: 'Web Search'
    },
    {
      icon: MapIcon,
      title: 'Google Maps'
    },
    {
      icon: TelescopeIcon,
      title: 'Deep Research'
    },
    {
      icon: AtomIcon,
      title: 'RAG'
    },
    {
      icon: PaletteIcon,
      title: 'Immersion'
    },
    {
      icon: ChromeIcon,
      title: 'Browser Use'
    },
    {
      icon: ComputerIcon,
      title: 'Computer Use'
    },
    {
      icon: DatabaseIcon,
      title: 'Data Controls'
    },
    {
      icon: InfoIcon,
      title: 'About Exodus'
    }
  ]
}
