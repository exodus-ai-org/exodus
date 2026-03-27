import '@/assets/stylesheets/globals.css'
import { fetcher } from '@shared/utils/http'
import { Provider } from 'jotai'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { SWRConfig } from 'swr'

import 'react-medium-image-zoom/dist/styles.css'
import { ThemeProvider } from '@/components/theme-provider'
import { router } from '@/routes'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <SWRConfig value={{ fetcher }}>
    <Provider>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </Provider>
  </SWRConfig>
)
