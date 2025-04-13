import { Providers } from '@shared/types/ai'
import {
  Atom,
  AudioWaveform,
  Bot,
  BrainCircuit,
  Chrome,
  CloudDownload,
  Database,
  FileUp,
  Globe,
  Hammer,
  HandCoins,
  Info,
  Monitor,
  Palette
} from 'lucide-react'

export const schema = {
  navMain: [
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
          title: Providers.DeepSeek
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
      title: 'Assistant Avatar',
      icon: Bot
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
      icon: Globe,
      title: 'Web Search'
    },
    {
      icon: BrainCircuit,
      title: 'Deep Research'
    },
    {
      icon: Atom,
      title: 'RAG'
    },
    {
      icon: Palette,
      title: 'Artifacts'
    },
    {
      icon: Chrome,
      title: 'Browser Use'
    },
    {
      icon: Monitor,
      title: 'Computer Use'
    },
    {
      icon: Database,
      title: 'Import / Export Data'
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
