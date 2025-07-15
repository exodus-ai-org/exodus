import { Tool } from 'ai'

export enum Providers {
  OpenAiGpt = 'OpenAI GPT',
  AzureOpenAi = 'Azure OpenAI',
  AnthropicClaude = 'Anthropic Claude',
  GoogleGemini = 'Google Gemini',
  XaiGrok = 'xAI Grok',
  Ollama = 'Ollama'
}

export enum AdvancedTools {
  WebSearch = 'Web Search',
  Reasoning = 'Reasoning',
  DeepResearch = 'Deep Research',
  Artifacts = 'Artifacts'
}

export interface McpTools {
  mcpServerName: string
  tools: Record<string, Tool>
}
