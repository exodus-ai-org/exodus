import {
  addMemories,
  getMemories,
  retrieveMemories
} from '@mem0/vercel-ai-provider'
import { LanguageModelV1Prompt } from 'ai'
import { Settings } from '../db/schema'

export async function addMemoriesByMem0(
  {
    messages
  }: {
    messages: LanguageModelV1Prompt
  },
  { settings }: { settings: Settings }
) {
  await addMemories(messages, {
    user_id: settings.mem0?.mem0UserName,
    mem0ApiKey: settings.mem0?.mem0ApiKey
  })
}

export async function retrieveMemoriesByMem0(
  {
    prompt
  }: {
    prompt: string | LanguageModelV1Prompt
  },
  { settings }: { settings: Settings }
) {
  return await retrieveMemories(prompt, {
    user_id: settings.mem0?.mem0UserName,
    mem0ApiKey: settings.mem0?.mem0ApiKey
  })
}

export async function getMemoriesByMem0(
  {
    prompt
  }: {
    prompt: string | LanguageModelV1Prompt
  },
  { settings }: { settings: Settings }
) {
  return await getMemories(prompt, {
    user_id: settings.mem0?.mem0UserName,
    mem0ApiKey: settings.mem0?.mem0ApiKey
  })
}
