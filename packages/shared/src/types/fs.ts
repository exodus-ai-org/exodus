export interface DirectoryNode {
  name: string
  type: 'directory'
  path: string
  children: (DirectoryNode | FileNode)[]
}

export interface FileNode {
  name: string
  type: 'file'
  path: string
}
