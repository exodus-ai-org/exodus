import {
  Atom,
  AudioWaveform,
  BookOpenText,
  BrainCircuit,
  CloudDownload,
  Globe,
  Hammer,
  HandCoins,
  Info,
  Palette
} from 'lucide-react'

export const data = {
  navMain: [
    {
      title: 'General',
      icon: BookOpenText
    },
    {
      title: 'Provider',
      icon: HandCoins,
      items: [
        {
          title: 'OpenAI GPT'
        },
        {
          title: 'Azure OpenAI'
        },
        {
          title: 'Anthropic Claude'
        },
        {
          title: 'Google Gemini'
        },
        {
          title: 'xAI Grok'
        },
        {
          title: 'Ollama'
        }
      ]
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
      icon: CloudDownload,
      title: 'Software Update'
    },
    {
      icon: Info,
      title: 'About Exodus'
    }
  ]
}
