import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

/**
 * TanStack Start entry — the framework imports this `createRouter` factory.
 * `routeTree.gen.ts` is generated automatically by the TanStack Start Vite
 * plugin from the files under `src/routes/` (do not edit it by hand).
 */
export function createRouter() {
  const router = createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultOnCatch: (error) => {
      // Silently swallow stale-route preload errors during HMR
      if (error?.message?.includes('_nonReactive')) return
      console.error('[Router]', error)
    },
  })

  // HMR: when routeTree.gen.ts changes, reload the router so
  // preloading doesn't hit stale (undefined) match references.
  if (import.meta.hot) {
    import.meta.hot.accept('./routeTree.gen', () => {
      // Force a full reload so the router reinitializes with the new tree
      window.location.reload()
    })
  }

  return router
}

// TanStack Start's hydration entry imports `getRouter` from this module
// (production `vite build` fails with "getRouter is not exported" without it).
export const getRouter = createRouter

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
