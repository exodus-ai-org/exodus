import { McpServerConfig } from './types'

export const mcpServerConfigs: McpServerConfig = {
  mcpServers: {
    'obsidian-mcp': {
      command: 'node',
      args: [
        '/path/to/obsidian-mcp/build/index.js',
        '/Users/<USERNAME>/Library/Mobile\\ Documents/iCloud~md~obsidian/Documents/<VAULT_NAME_1>',
        '/Users/<USERNAME>/Library/Mobile\\ Documents/iCloud~md~obsidian/Documents/<VAULT_NAME_2>'
      ]
    }
    // filesystem: {
    //   command: 'npx',
    //   args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/']
    // }
  }
}
