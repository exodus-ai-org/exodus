import { Setting } from '../../main/lib/db/schema'
import { McpTools } from './ai'

export interface Variables {
  tools: McpTools[]
  setting: Setting
}
