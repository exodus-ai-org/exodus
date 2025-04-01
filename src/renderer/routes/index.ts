import { Detail } from '@/containers/detail'
import { FileSystem } from '@/containers/file-system'
import { FileSystemDetail } from '@/containers/file-system-detail'
import { Home } from '@/containers/home'
import { Layout } from '@/layouts'
import { createBrowserRouter } from 'react-router'

export const router = createBrowserRouter([
  {
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: '/chat/:id', Component: Detail },
      { path: 'file-system', Component: FileSystem },
      { path: 'file-system/:folderName', Component: FileSystemDetail }
    ]
  }
])
