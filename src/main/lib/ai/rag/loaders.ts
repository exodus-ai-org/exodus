import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'

export async function loadFileContent(file: File) {
  if (file.type === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer()
    const loader = new PDFLoader(new Blob([arrayBuffer]))
    const docs = await loader.load()
    return docs.map((d) => d.pageContent).join('\n')
  }

  if (file.type === 'text/markdown' || file.type === 'text/plain') {
    return await file.text()
  }

  return ''
}
