import {
  BookOpenText,
  CloudDownload,
  Hammer,
  HandCoins,
  Info
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
      icon: CloudDownload,
      title: 'Software Update'
    },

    {
      icon: Info,
      title: 'About Exodus'
    }
  ]
}
