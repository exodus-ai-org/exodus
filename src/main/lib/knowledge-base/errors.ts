// src/main/lib/knowledge-base/errors.ts
export class LightRagError extends Error {
  status?: number
  body?: string
  constructor(message: string, opts?: { status?: number; body?: string }) {
    super(message)
    this.name = 'LightRagError'
    this.status = opts?.status
    this.body = opts?.body
  }
}
