// src/main/lib/knowledge-base/lightrag-client.ts
//
// The ONLY place LightRAG endpoint paths live. Tolerant of unknown response
// fields — LightRAG's API moves roughly monthly.
import { LightRagError } from './errors'

export interface LightRagHealth {
  status: string
  llmModel?: string
  embeddingModel?: string
  embeddingDim?: number
  documentCount?: number
}

export interface RetrievedContext {
  context: string
  references: { id: string; source: string }[]
}

export interface TrackStatus {
  status: 'pending' | 'processing' | 'processed' | 'failed'
  docId?: string
  error?: string
}

export class LightRagClient {
  private readonly baseUrl: string

  constructor(
    baseUrl: string,
    private readonly apiKey?: string
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
  }

  private async call<T>(
    path: string,
    init?: RequestInit & { okStatuses?: number[] }
  ): Promise<{ status: number; body: T }> {
    const headers: Record<string, string> = {
      accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(this.apiKey ? { 'X-API-Key': this.apiKey } : {})
    }
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}${path}`, { ...init, headers })
    } catch (err) {
      throw new LightRagError(
        `LightRAG request failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
    const ok = res.ok || (init?.okStatuses ?? []).includes(res.status)
    if (!ok) {
      const body = await res.text().catch(() => '')
      throw new LightRagError(`LightRAG ${path} → ${res.status}`, {
        status: res.status,
        body
      })
    }
    const body = (await res.json().catch(() => ({}))) as T
    return { status: res.status, body }
  }

  async health(): Promise<LightRagHealth> {
    const { body } = await this.call<Record<string, unknown>>('/health')
    const cfg = (body.configuration ?? {}) as Record<string, unknown>
    const docs = body.documents as Record<string, unknown> | undefined
    return {
      status: String(body.status ?? 'unknown'),
      llmModel: (cfg.llm_model ?? body.llm_model) as string | undefined,
      embeddingModel: (cfg.embedding_model ?? body.embedding_model) as
        | string
        | undefined,
      embeddingDim:
        Number(cfg.embedding_dim ?? body.embedding_dim) || undefined,
      documentCount:
        Number((body.document_count as number) ?? docs?.processed) || undefined
    }
  }

  async insertText(
    text: string,
    fileSource: string
  ): Promise<{ trackId: string }> {
    const { body } = await this.call<{ track_id?: string }>('/documents/text', {
      method: 'POST',
      body: JSON.stringify({ text, file_source: fileSource })
    })
    if (!body.track_id) throw new LightRagError('LightRAG returned no track_id')
    return { trackId: body.track_id }
  }

  async deleteDoc(lightragDocId: string): Promise<void> {
    await this.call(`/documents/${encodeURIComponent(lightragDocId)}`, {
      method: 'DELETE',
      okStatuses: [404]
    })
  }

  async trackStatus(trackId: string): Promise<TrackStatus> {
    const { body } = await this.call<Record<string, unknown>>(
      `/documents/track_status/${encodeURIComponent(trackId)}`
    )
    const docs = (body.documents ?? []) as Array<Record<string, unknown>>
    const first = docs[0] ?? {}
    const raw = String(first.status ?? body.status ?? 'processing')
    const status: TrackStatus['status'] =
      raw === 'processed' || raw === 'failed' || raw === 'pending'
        ? raw
        : 'processing'
    return {
      status,
      docId: (first.id ?? first.doc_id) as string | undefined,
      error: (first.error_msg ?? first.error) as string | undefined
    }
  }

  async retrieve(
    query: string,
    opts: { mode: string; topK: number; chunkTopK: number }
  ): Promise<RetrievedContext> {
    const { body } = await this.call<{
      response?: string
      references?: Array<{ reference_id?: string; file_path?: string }>
    }>('/query', {
      method: 'POST',
      body: JSON.stringify({
        query,
        mode: opts.mode,
        top_k: opts.topK,
        chunk_top_k: opts.chunkTopK,
        only_need_context: true,
        include_references: true,
        max_total_tokens: 8000
      })
    })
    return {
      context: body.response ?? '',
      references: (body.references ?? []).map((r) => ({
        id: r.reference_id ?? '',
        source: r.file_path ?? ''
      }))
    }
  }
}
