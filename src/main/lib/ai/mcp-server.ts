import { McpServerConfig } from './types'

export const mcpServerConfigs: McpServerConfig = {
  mcpServers: {
    'obsidian-mcp': {
      command: 'node',
      args: [
        '/Users/bytedance/code/obsidian-mcp/build/index.js',
        '/Usersbytedance/Library/Mobile\\ Documents/iCloud~md~obsidian/Documents/YanceyOfficial'
      ]
    }
    // filesystem: {
    //   command: 'npx',
    //   args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/']
    // }
  }
}
