import { app, shell } from 'electron'
import { mkdir, readdir, stat } from 'fs/promises'
import { basename, join, resolve } from 'path'

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

export async function getDirectoryTree(
  path: string
): Promise<DirectoryNode | null> {
  const directoryPath = app.getPath('userData') + path

  async function traverseDirectory(
    currentPath: string,
    currentName: string
  ): Promise<DirectoryNode | null> {
    try {
      const entries = await readdir(currentPath, { withFileTypes: true })
      const node: DirectoryNode = {
        name: currentName,
        type: 'directory',
        path: currentPath,
        children: []
      }

      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name)

        if (entry.isFile()) {
          node.children.push({
            name: entry.name,
            type: 'file',
            path: fullPath
          })
        } else if (entry.isDirectory()) {
          const childNode = await traverseDirectory(fullPath, entry.name)
          if (childNode) {
            node.children.push(childNode)
          }
        }
      }
      return node
    } catch (error) {
      console.error(
        `Error reading directory ${currentPath}:`,
        error instanceof Error ? error.message : error
      )
      return null
    }
  }

  try {
    const absoluteDirectoryPath = resolve(directoryPath)
    const baseName = basename(absoluteDirectoryPath)
    const tree = await traverseDirectory(absoluteDirectoryPath, baseName)
    return tree
  } catch (error) {
    console.error(
      `Error processing directory ${directoryPath}:`,
      error instanceof Error ? error.message : error
    )
    return null
  }
}

export async function getStat(path: string) {
  const stats = await stat(path)

  return {
    size: stats.size,
    created: stats.birthtime,
    modified: stats.mtime,
    accessed: stats.atime,
    isDirectory: stats.isDirectory(),
    isFile: stats.isFile(),
    permissions: stats.mode.toString(8).slice(-3)
  }
}

export async function openFileManagerApp(path: string) {
  const stats = await stat(path)

  if (stats.isFile()) {
    shell.showItemInFolder(path)
  } else {
    shell.openPath(path)
  }
}

export async function createFolder(path: string) {
  await mkdir(path, { recursive: true })
}
