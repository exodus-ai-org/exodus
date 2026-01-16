import { os } from '@orpc/server'
import { OrpcContext } from '../contexts'
import { speech, transcriptions } from './audio'
import {
  deleteChat,
  getMcpTools,
  getMessages,
  search,
  stream,
  update as updateChat
} from './chat'
import { exportData, importData } from './db-io'
import {
  getMessages as getDeepResearchMessages,
  getResult
} from './deep-research'
import { getAll } from './history'
import { list, retrieve, upload } from './rag'
import { createUploadUrl } from './s3-uploader'
import { get, update } from './setting'
import { markdownToPdf, pingOllama } from './tools'
import { execute } from './workflow'

export const base = os.$context<OrpcContext>()

export const router = {
  dbIo: {
    exportData,
    importData
  },
  history: {
    getAll
  },
  rag: {
    retrieve,
    upload,
    list
  },
  s3Uploader: {
    createUploadUrl
  },
  setting: {
    get,
    update
  },
  audio: {
    speech,
    transcriptions
  },
  tools: {
    markdownToPdf,
    pingOllama
  },
  workflow: {
    execute
  },
  chat: {
    getMcpTools,
    search,
    getMessages,
    delete: deleteChat,
    update: updateChat,
    stream
  },
  deepResearch: {
    getMessages: getDeepResearchMessages,
    getResult
    // Note: POST / and GET /sse endpoints not yet migrated (see MIGRATION_SUMMARY.md)
  }
}
