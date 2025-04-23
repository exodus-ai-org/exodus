import { DirectoryNode } from '@shared/types/fs'
import { app, shell } from 'electron'
import { mkdir, readdir, rename, stat, writeFile } from 'fs/promises'
import { basename, join, resolve } from 'path'

export function getUserDataPath() {
  return app.getPath('userData')
}

export async function getDirectoryTree(
  path: string
): Promise<DirectoryNode | null> {
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
    const absoluteDirectoryPath = resolve(path)
    const baseName = basename(absoluteDirectoryPath)
    const tree = await traverseDirectory(absoluteDirectoryPath, baseName)
    return tree
  } catch (error) {
    console.error(
      `Error processing directory ${path}:`,
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

export async function createDirectory(path: string) {
  await mkdir(path, { recursive: true })
}

export async function renameFile(source: string, destination: string) {
  await rename(source, destination)
}

export async function copyFiles(
  buffers: {
    name: string
    buffer: ArrayBuffer
  }[],
  targetDir: string
): Promise<void> {
  for (const { name, buffer } of buffers) {
    await writeFile(join(targetDir, name), Buffer.from(buffer))
  }
}
