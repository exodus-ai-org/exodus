import '@/assets/stylesheets/globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { AppSidebar } from '@/layouts/app-sidebar'
import { NavActions } from '@/layouts/nav-actions'
import { router } from '@/routes'
import { Provider } from 'jotai'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { migrate } from './lib/db/migrate'

// migrate pglite tables
migrate()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider>
      <ThemeProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <div className="bg-background flex h-dvh min-w-0 flex-col">
              <header className="sticky flex h-14 w-full shrink-0 items-center gap-2">
                <div className="flex flex-1 items-center gap-2 px-3">
                  <SidebarTrigger />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                </div>
                <div className="ml-auto px-3">
                  <NavActions />
                </div>
              </header>
              <RouterProvider router={router} />
              <Toaster />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
)
