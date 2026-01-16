import { os, streamToEventIterator } from '@orpc/server'
import { ErrorCode } from '@shared/constants/error-codes'
import {
  ConfigurationError,
  NotFoundError,
  ValidationError
} from '@shared/errors'
import { AdvancedTools } from '@shared/types/ai'
import { appendResponseMessages, streamText } from 'ai'
import { v4 as uuidV4 } from 'uuid'
import z from 'zod'
import { deepResearchBootPrompt, systemPrompt } from '../../ai/prompts'
import {
  bindCallingTools,
  generateTitleFromUserMessage,
  getModelFromProvider,
  getMostRecentUserMessage,
  getTrailingMessageId
} from '../../ai/utils/chat-message-util'
import {
  deleteChatById,
  fullTextSearchOnMessages,
  getChatById,
  getMessagesByChatId,
  getSettings,
  saveChat,
  saveMessages,
  updateChat
} from '../../db/queries'
import { withCallingTools } from '../middlewares/calling-tools'

// Get MCP tools
export const getMcpTools = os.use(withCallingTools).handler(({ context }) => {
  return { tools: context.tools }
})

// Search messages
export const search = os
  .input(
    z.object({
      query: z.string()
    })
  )
  .handler(async ({ input }) => {
    return await fullTextSearchOnMessages(input.query)
  })

// Get chat messages by ID
export const getMessages = os
  .input(
    z.object({
      id: z.string()
    })
  )
  .handler(async ({ input }) => {
    const chat = await getChatById({ id: input.id })
    if (!chat) {
      throw new NotFoundError(ErrorCode.CHAT_NOT_FOUND, undefined, {
        chatId: input.id
      })
    }

    return await getMessagesByChatId({ id: input.id })
  })

// Delete chat
export const deleteChat = os
  .input(
    z.object({
      id: z.string()
    })
  )
  .handler(async ({ input }) => {
    await deleteChatById({ id: input.id })
    return { success: true }
  })

// Update chat
export const update = os
  .input(
    z.object({
      id: z.string(),
      title: z.string(),
      favorite: z.boolean().nullable()
    })
  )
  .handler(async ({ input }) => {
    await updateChat(input)
    return { success: true, message: `Succeed to update chat ${input.id}` }
  })

// Stream chat completion (main chat endpoint)
export const stream = os
  .use(withCallingTools)
  .input(
    z.object({
      id: z.string(),
      messages: z.array(z.any()), // UIMessage[] from ai SDK
      advancedTools: z.array(z.nativeEnum(AdvancedTools))
    })
  )
  .handler(async ({ input, context }) => {
    const { id, messages, advancedTools } = input
    const mcpTools = context.tools

    const setting = await getSettings()
    if (!('id' in setting)) {
      throw new ConfigurationError(
        ErrorCode.SETTING_NOT_FOUND,
        'Failed to retrieve settings'
      )
    }

    if (!setting.providerConfig?.chatModel) {
      throw new ConfigurationError(ErrorCode.CONFIG_MISSING_CHAT_MODEL)
    }

    if (!setting.providerConfig?.reasoningModel) {
      throw new ConfigurationError(ErrorCode.CONFIG_MISSING_REASONING_MODEL)
    }

    const userMessage = getMostRecentUserMessage(messages)
    if (!userMessage) {
      throw new ValidationError(ErrorCode.VALIDATION_NO_USER_MESSAGE)
    }

    const { chatModel, reasoningModel } = await getModelFromProvider()

    // Create chat if doesn't exist
    const existingChat = await getChatById({ id })
    if (!existingChat) {
      const title = await generateTitleFromUserMessage({
        model: chatModel,
        message: userMessage
      })
      await saveChat({ id, title })
    }

    // Save user message
    await saveMessages({
      messages: [
        {
          ...userMessage,
          chatId: id,
          id: userMessage.id,
          role: 'user',
          parts: userMessage.parts,
          attachments: userMessage.experimental_attachments ?? [],
          createdAt: new Date()
        }
      ]
    })

    // Stream response
    const result = streamText({
      model:
        advancedTools.includes(AdvancedTools.Reasoning) ||
        advancedTools.includes(AdvancedTools.DeepResearch)
          ? reasoningModel
          : chatModel,
      system: advancedTools.includes(AdvancedTools.DeepResearch)
        ? deepResearchBootPrompt
        : systemPrompt,
      messages,
      maxSteps: setting.providerConfig?.maxSteps ?? 1,
      tools: bindCallingTools({ mcpTools, advancedTools, setting }),
      experimental_generateMessageId: uuidV4,
      onFinish: async ({ response }) => {
        try {
          const assistantId = getTrailingMessageId({
            messages: response.messages.filter(
              (message) => message.role === 'assistant'
            )
          })

          if (!assistantId) {
            throw new Error('No assistant message found!')
          }

          const [, assistantMessage] = appendResponseMessages({
            messages: [userMessage],
            responseMessages: response.messages
          })

          await saveMessages({
            messages: [
              {
                id: assistantId,
                chatId: id,
                role: assistantMessage.role,
                parts: assistantMessage.parts,
                attachments: assistantMessage.experimental_attachments ?? [],
                createdAt: new Date()
              }
            ]
          })
        } catch (error) {
          console.error('Failed to save assistant message:', error)
        }
      }
    })

    return streamToEventIterator(result.toUIMessageStream())
  })
