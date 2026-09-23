import type { AgentTool } from '@earendil-works/pi-agent-core'

export enum AiProviders {
  OpenAiGpt = 'OpenAI GPT',
  AzureOpenAi = 'Azure OpenAI',
  AnthropicClaude = 'Anthropic Claude',
  GoogleGemini = 'Google Gemini',
  XaiGrok = 'xAI Grok',
  Ollama = 'Ollama'
}

export enum AdvancedTools {
  DeepResearch = 'Deep Research'
}

export interface McpTools {
  mcpServerName: string
  /** The server's description from Settings, for the prompt's directory. */
  description?: string
  tools: AgentTool[]
}
