import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

export function getSplitter(fileType: string) {
  if (fileType === 'application/pdf') {
    return new RecursiveCharacterTextSplitter({
      chunkSize: 1024,
      chunkOverlap: 128,
      separators: ['\n\n', '\n', ' ', '']
    })
  }

  if (fileType === 'text/markdown') {
    return RecursiveCharacterTextSplitter.fromLanguage('markdown', {
      chunkSize: 1024,
      chunkOverlap: 128,
      separators: ['\n# ', '\n## ', '\n### ', '\n```', '\n\n', ' ', '']
    })
  }

  if (fileType === 'text/plain') {
    return new RecursiveCharacterTextSplitter({
      chunkSize: 1024,
      chunkOverlap: 128
    })
  }

  return new RecursiveCharacterTextSplitter({
    chunkSize: 1024,
    chunkOverlap: 128
  })
}
