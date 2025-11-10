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
  PaletteIcon,
  TelescopeIcon
} from 'lucide-react'

export const menus = {
  navMain: [
    {
      title: 'General',
      icon: CogIcon
    },
    {
      title: 'AiProviders',
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
      title: 'File Upload Endpoint',
      icon: FileUpIcon
    },
    {
      icon: HammerIcon,
      title: 'MCP Servers'
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
