import {
  AiProvider,
  ControlFlowType,
  DataSourceType,
  NodeType
} from '@shared/types/workflow'
import {
  BrainIcon,
  CpuIcon,
  DatabaseIcon,
  GitBranchIcon,
  GlobeIcon,
  NetworkIcon,
  RepeatIcon,
  SearchIcon,
  SigmaIcon,
  SparklesIcon
} from 'lucide-react'

export const nodeTree = [
  // --- Data Source ---
  {
    type: NodeType.DataSource,
    icon: DatabaseIcon,
    title: 'Data Source',
    description:
      'Provides data to the workflow — from HTTP requests, APIs, or web searches.',
    children: [
      {
        type: DataSourceType.HttpJsonResponse,
        icon: NetworkIcon,
        title: 'HTTP Request',
        description:
          'Fetch data from an API endpoint and return the JSON response.'
      },
      {
        type: DataSourceType.WebSearchResponse,
        icon: SearchIcon,
        title: 'Web Search',
        description:
          'Retrieve live search results from Google or other engines.'
      }
    ]
  },

  // --- Control Flow ---
  {
    type: NodeType.ControlFlow,
    icon: GitBranchIcon,
    title: 'Control Flow',
    description:
      'Control how your workflow executes — conditionally or in loops.',
    children: [
      {
        type: ControlFlowType.Condition,
        icon: GitBranchIcon,
        title: 'Condition',
        description:
          'Route execution into true/false branches based on a condition.'
      },
      {
        type: ControlFlowType.Loop,
        icon: RepeatIcon,
        title: 'Loop',
        description:
          'Iterate over lists or repeat actions until a condition is met.'
      }
    ]
  },

  // --- Data Transformation ---
  {
    type: NodeType.DataTransformation,
    icon: SigmaIcon,
    title: 'Data Transformation',
    description:
      'Transform, clean, or map data before passing to the next node.',
    children: [
      {
        type: 'map',
        icon: RepeatIcon,
        title: 'Map / Transform',
        description:
          'Modify or reshape input data objects for later processing.'
      },
      {
        type: 'filter',
        icon: GitBranchIcon,
        title: 'Filter',
        description: 'Filter data based on specific rules or conditions.'
      }
    ]
  },

  // --- AI ---
  {
    type: NodeType.AI,
    icon: SparklesIcon,
    title: 'AI',
    description:
      'Integrate large language models (LLMs) and AI services into your workflow.',
    children: [
      {
        type: AiProvider.Anthropic,
        icon: BrainIcon,
        title: 'Anthropic',
        description:
          'Use Claude models from Anthropic for reasoning and text generation.'
      },
      {
        type: AiProvider.Google,
        icon: GlobeIcon,
        title: 'Google',
        description: 'Use Gemini models from Google for multimodal AI tasks.'
      },
      {
        type: AiProvider.Ollama,
        icon: CpuIcon,
        title: 'Ollama',
        description: 'Run local or self-hosted LLMs using the Ollama runtime.'
      },
      {
        type: AiProvider.OpenAI,
        icon: SparklesIcon,
        title: 'OpenAI',
        description:
          'Access ChatGPT and GPT models for text, chat, and reasoning.'
      }
    ]
  }
]
