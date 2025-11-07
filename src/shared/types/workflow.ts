export enum NodeType {
  DataSource,
  DataTransformation,
  ControlFlow,
  AI,
  Database,
  Application
}

export enum DataSourceType {
  HttpJsonResponse,
  WebSearchResponse,
  EmailEngine,
  Rag,
  ManualText,
  Webhook,
  File
}

export enum ControlFlowType {
  Condition,
  Loop,
  Merge,
  Parallel,
  Delay,
  TryCatch
}

export enum AiProvider {
  OpenAI,
  Anthropic,
  Google,
  Ollama
}

export enum ApplicationType {
  InteractionBrokers
}

export enum AIOutputFormat {
  Text,
  Json
}

export enum NodeStatus {
  Idle = 'Idle',
  Running = 'Running',
  Success = 'Success',
  Error = 'Error'
}

export enum ExecutionContext {
  Manual = 'Manual',
  Scheduled = 'Scheduled',
  Event = 'Event'
}

export enum FileType {
  Text,
  Json,
  Csv,
  Pdf,
  Word,
  Excel,
  Powerpoint,
  Image,
  Audio,
  Video
}

export enum FormElementType {
  Input,
  Select,
  Switch,
  TextArea,
  JsonTextArea
}

export enum DataTransformationType {
  Code
}
