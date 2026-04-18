import type { AgentTool } from '@mariozechner/pi-agent-core'

export enum AiProviders {
  OpenAiGpt = 'OpenAI GPT',
  AzureOpenAi = 'Azure OpenAI',
  AnthropicClaude = 'Anthropic Claude',
  GoogleGemini = 'Google Gemini',
  XaiGrok = 'xAI Grok',
  Ollama = 'Ollama'
}

export enum AdvancedTools {
  Reasoning = 'Reasoning',
  DeepResearch = 'Deep Research'
}

export interface McpTools {
  mcpServerName: string
  tools: AgentTool[]
}
