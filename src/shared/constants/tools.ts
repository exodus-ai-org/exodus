export interface ToolMeta {
  key: string
  label: string
  description: string
  group: ToolGroup
}

export type ToolGroup = 'Web' | 'File System' | 'AI & Data' | 'Maps'

export const TOOL_REGISTRY: ToolMeta[] = [
  // Web
  {
    key: 'weather',
    label: 'Weather',
    description: 'Look up current weather and forecasts by location',
    group: 'Web'
  },
  {
    key: 'webSearch',
    label: 'Web Search',
    description: 'Search the web via Brave Search API (requires API key)',
    group: 'Web'
  },
  {
    key: 'webFetch',
    label: 'Web Fetch',
    description: 'Fetch the content of a URL (docs, APIs, GitHub files)',
    group: 'Web'
  },

  // File System
  {
    key: 'terminal',
    label: 'Terminal',
    description: 'Execute shell commands on your machine',
    group: 'File System'
  },
  {
    key: 'readFile',
    label: 'Read File',
    description: 'Read file contents by path',
    group: 'File System'
  },
  {
    key: 'writeFile',
    label: 'Write File',
    description: 'Create or overwrite files',
    group: 'File System'
  },
  {
    key: 'editFile',
    label: 'Edit File',
    description: 'Targeted string replacement in existing files',
    group: 'File System'
  },
  {
    key: 'listDirectory',
    label: 'List Directory',
    description: 'List files and folders in a directory',
    group: 'File System'
  },
  {
    key: 'findFiles',
    label: 'Find Files',
    description: 'Search for files by glob pattern',
    group: 'File System'
  },
  {
    key: 'grep',
    label: 'Grep',
    description: 'Search file contents by regex pattern',
    group: 'File System'
  },

  // AI & Data
  {
    key: 'imageGeneration',
    label: 'Image Generation',
    description: 'Generate images via DALL-E (requires OpenAI API key)',
    group: 'AI & Data'
  },

  // Maps
  {
    key: 'googleMapsPlaces',
    label: 'Google Maps Places',
    description: 'Search for places and points of interest',
    group: 'Maps'
  },
  {
    key: 'googleMapsRouting',
    label: 'Google Maps Routing',
    description: 'Get directions and route information',
    group: 'Maps'
  }
]

export const TOOL_GROUPS: ToolGroup[] = [
  'Web',
  'File System',
  'AI & Data',
  'Maps'
]
