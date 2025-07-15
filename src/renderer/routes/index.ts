import { Detail } from '@/containers/detail'
import { Home } from '@/containers/home'
import { Layout } from '@/layouts'
import { createHashRouter } from 'react-router'

export const router = createHashRouter([
  {
    Component: Layout,
    children: [
      { path: '/', Component: Home },
      { path: '/chat/:id', Component: Detail }
    ]
  }
])
