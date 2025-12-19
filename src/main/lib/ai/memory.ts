import {
  addMemories,
  getMemories,
  retrieveMemories
} from '@mem0/vercel-ai-provider'
import { LanguageModelV1Prompt } from 'ai'
import { Setting } from '../db/schema'

export async function addMemoriesByMem0(
  {
    messages
  }: {
    messages: LanguageModelV1Prompt
  },
  { setting }: { setting: Setting }
) {
  await addMemories(messages, {
    user_id: setting.mem0?.mem0UserName,
    mem0ApiKey: setting.mem0?.mem0ApiKey
  })
}

export async function retrieveMemoriesByMem0(
  {
    prompt
  }: {
    prompt: string | LanguageModelV1Prompt
  },
  { setting }: { setting: Setting }
) {
  return await retrieveMemories(prompt, {
    user_id: setting.mem0?.mem0UserName,
    mem0ApiKey: setting.mem0?.mem0ApiKey
  })
}

export async function getMemoriesByMem0(
  {
    prompt
  }: {
    prompt: string | LanguageModelV1Prompt
  },
  { setting }: { setting: Setting }
) {
  return await getMemories(prompt, {
    user_id: setting.mem0?.mem0UserName,
    mem0ApiKey: setting.mem0?.mem0ApiKey
  })
}
