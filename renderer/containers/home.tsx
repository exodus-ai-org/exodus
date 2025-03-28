import { Chat } from '@/components/chat'
import { openai } from '@/lib/ai/providers/openai'
import { generateText, jsonSchema, Tool, tool } from 'ai'
import { useState } from 'react'
import { v4 as uuidV4 } from 'uuid'
import { ToolMap } from '../../electron/lib/ai/types'

export function Home() {
  const [text, setText] = useState('')

  const aiFromMcp = async () => {
    const tools: ToolMap = await window.mcpServers['list-tools']()

    const toolset: {
      [index: string]: Tool
    } = {}
    Object.keys(tools).forEach((serverName) => {
      tools[serverName].forEach(
        ({ name: toolName, description, inputSchema }) => {
          toolset[toolName] = tool({
            description,
            parameters: jsonSchema(inputSchema),
            execute: async (args: any) => window.mcpServers[toolName](args)
          })
        }
      )
    })

    const { text } = await generateText({
      model: openai('gpt-4o'),
      prompt: '通过查找目录, 一步步的找出关于英语定语从句的文章',
      maxSteps: 20,
      tools: toolset
    })
    setText(text)
  }

  return <Chat id={uuidV4()} initialMessages={[]} />
}
