import '@/assets/stylesheets/globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { router } from '@/routes'
import { fetcher } from '@shared/utils/http'
import { Provider } from 'jotai'
import ReactDOM from 'react-dom/client'
import 'react-medium-image-zoom/dist/styles.css'
import { RouterProvider } from 'react-router'
import { SWRConfig } from 'swr'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <SWRConfig value={{ fetcher }}>
    <Provider>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </Provider>
  </SWRConfig>
)
