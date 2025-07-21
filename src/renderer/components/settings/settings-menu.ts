import { Providers } from '@shared/types/ai'
import {
  Atom,
  AudioWaveform,
  Chrome,
  CloudDownload,
  Cog,
  Computer,
  Database,
  FileUp,
  Globe,
  Hammer,
  HandCoins,
  Image,
  Info,
  Map,
  Palette,
  Telescope
} from 'lucide-react'

export const menus = {
  navMain: [
    {
      title: 'General',
      icon: Cog
    },
    {
      title: 'Providers',
      icon: HandCoins,
      items: [
        {
          title: Providers.OpenAiGpt
        },
        {
          title: Providers.AzureOpenAi
        },
        {
          title: Providers.AnthropicClaude
        },
        {
          title: Providers.GoogleGemini
        },
        {
          title: Providers.XaiGrok
        },
        {
          title: Providers.Ollama
        }
      ]
    },
    {
      title: 'File Upload Endpoint',
      icon: FileUp
    },
    {
      icon: Hammer,
      title: 'MCP Servers'
    },
    {
      icon: AudioWaveform,
      title: 'Audio and Speech'
    },
    {
      icon: Image,
      title: 'Image Generation'
    },
    {
      icon: Globe,
      title: 'Web Search'
    },
    {
      icon: Map,
      title: 'Google Maps'
    },
    {
      icon: Telescope,
      title: 'Deep Research'
    },
    {
      icon: Atom,
      title: 'RAG'
    },
    {
      icon: Palette,
      title: 'Immersion'
    },
    {
      icon: Chrome,
      title: 'Browser Use'
    },
    {
      icon: Computer,
      title: 'Computer Use'
    },
    {
      icon: Database,
      title: 'Data Controls'
    },
    {
      icon: CloudDownload,
      title: 'Software Update'
    },
    {
      icon: Info,
      title: 'About Exodus'
    }
  ]
}
