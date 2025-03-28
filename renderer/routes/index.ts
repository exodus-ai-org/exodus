import { Detail } from '@/containers/detail'
import { FileSystem } from '@/containers/file-system'
import { Home } from '@/containers/home'
import { createBrowserRouter } from 'react-router'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Home
  },
  {
    path: '/chat/:id',
    Component: Detail
  },
  {
    path: '/file-system',
    Component: FileSystem
  }
])
