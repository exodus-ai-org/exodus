export interface DocumentType {
  favicon: string
  type: 'pdf' | 'html'
  link: string
  title: string
  content: string
  snippet: string
  tokenCount: number
}

export type DocumentTypeWithoutTokenCount = Exclude<DocumentType, 'tokenCount'>
