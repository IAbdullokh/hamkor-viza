import { Suspense } from 'react'
import { createHashHistory, createRootRoute, createRoute, createRouter, Navigate, Outlet, RouterProvider } from '@tanstack/react-router'
import { ToastProvider, TooltipProvider } from '@/ui/overlay'
import { MotionLayer } from '@/shell/MotionLayer'
import { ThemeController } from '@/shell/ThemeController'
import { Wallpaper } from '@/shell/Wallpaper'
import { lastPage } from '@/features/projects/live/refresh'
import { config } from '@/config'
import { Shell } from './Shell'
import { DashboardRoute } from './Dashboard'

/**
 * Routes (hash router, so any static host serves it without rewrite rules):
 *   #/l/<slug>/<page>   one page of the dashboard
 *   anything else       → the page this browser showed last, else the first page
 * The /l/<slug>/… shape is the one Studio's published address uses, so its links keep working here.
 */
function Root() {
  return (
    <TooltipProvider>
      <ToastProvider>
        <ThemeController workspaceAccent="blue" />
        <MotionLayer />
        <Wallpaper />
        <Shell>
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </Shell>
      </ToastProvider>
    </TooltipProvider>
  )
}

function Home() {
  const slug = config.project.slug
  const remembered = lastPage(slug)
  const page = config.project.pages.find((p) => p === remembered) ?? config.project.pages[0]!
  return <Navigate to="/l/$slug/$page" params={{ slug, page }} replace />
}

const rootRoute = createRootRoute({ component: Root })
const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Home })
const liveIndexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/l/$slug', component: Home })
const liveRoute = createRoute({ getParentRoute: () => rootRoute, path: '/l/$slug/$page', component: DashboardRoute })

export const router = createRouter({
  routeTree: rootRoute.addChildren([homeRoute, liveIndexRoute, liveRoute]),
  history: createHashHistory(),
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultNotFoundComponent: Home,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function App() {
  return <RouterProvider router={router} />
}
