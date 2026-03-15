export interface Embedding {
  embedding: number[]
  content: string
}

export interface EmbeddingConfig {
  apiKey: string
  model: string
  baseUrl?: string
}

interface EmbeddingResponseItem {
  embedding: number[]
  index: number
}

interface EmbeddingResponse {
  data: EmbeddingResponseItem[]
}

// transform user's prompt to embedding vector
export const generateEmbedding = async (
  { value }: { value: string },
  config: EmbeddingConfig
): Promise<number[]> => {
  const input = value.replaceAll('\\n', ' ')
  const baseUrl = config.baseUrl ?? 'https://api.openai.com/v1'
  const response = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({ model: config.model, input })
  })
  if (!response.ok) throw new Error(`Embedding API error: ${response.status}`)
  const data = (await response.json()) as EmbeddingResponse
  return data.data[0].embedding
}

// batch transform knowledge bases to embedding vector
export const generateEmbeddings = async (
  { chunks }: { chunks: string[] },
  config: EmbeddingConfig
): Promise<Embedding[]> => {
  const baseUrl = config.baseUrl ?? 'https://api.openai.com/v1'
  const response = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({ model: config.model, input: chunks })
  })
  if (!response.ok) throw new Error(`Embeddings API error: ${response.status}`)
  const data = (await response.json()) as EmbeddingResponse
  return data.data.map((item, i) => ({
    content: chunks[i],
    embedding: item.embedding
  }))
}
