/// <reference types="vite/client" />
import {
  HeadContent,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import type { ReactNode } from 'react'
import indexCss from '../index.css?url'

/**
 * Pre-paint theme script. Runs synchronously in <head> BEFORE first paint, so
 * the document renders in the correct theme on the very first frame â€” no flash.
 * Dark mode is a single `.dark` class on <html>; the token values in index.css
 * flip under it. Persisted to localStorage, falls back to system preference.
 */
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
})

/**
 * Root route â€” owns the HTML document (SSR), global <head> (SEO-ready),
 * and the app-wide providers.
 *
 * NO app chrome (sidebar/top bar) is applied here by default, so every app â€”
 * landing pages, marketing sites, content, games â€” renders FULL-BLEED.
 * Building a SaaS / dashboard app? Opt into the sidebar shell by ADDING a
 * `src/routes/_app.tsx` pathless layout route with pages under `src/routes/_app/`
 * (a `_app.tsx` with no children conflicts with this index route). Keep this
 * root bare â€” don't add chrome here.
 *
 * SEO/AEO: <HeadContent /> renders the merged head() output (title, meta,
 * Open Graph, links) on the server, so crawlers and AI bots receive a
 * fully-rendered, indexable document on the first request. Per-page routes
 * override title/description via their own head().
 *
 * SSR: this document (and every route) is server-rendered/prerendered. A child
 * that reads browser-only state at render â€” `blink.auth`/`onAuthStateChanged`,
 * `localStorage`, `window` â€” must be wrapped in `<BlinkClientBoundary>`
 * (`src/components/BlinkClientBoundary.tsx`) or use the route's `ssr: false`,
 * or the page ships blank / hydration-mismatched. Do NOT read SDK/auth here.
 */
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      { title: 'DChicken | ظ…ظ†طµط© طھظˆط²ظٹط¹ ط§ظ„ط¯ط¬ط§ط¬' },
      { name: 'description', content: 'ظ…ظ†طµط© ظ„ظˆط¬ط³طھظٹط© ظ„ط¥ط¯ط§ط±ط© طھظˆط²ظٹط¹ ط§ظ„ط¯ط¬ط§ط¬ ظ…ظ† ط§ظ„ظ…ط²ط§ط±ط¹ ط¥ظ„ظ‰ ط§ظ„ظ…ط·ط§ط¹ظ…' },
      { name: 'theme-color', content: '#0a0a0a' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: 'DChicken | ظ…ظ†طµط© طھظˆط²ظٹط¹ ط§ظ„ط¯ط¬ط§ط¬' },
      { property: 'og:description', content: 'ظ…ظ†طµط© ظ„ظˆط¬ط³طھظٹط© ظ„ط¥ط¯ط§ط±ط© طھظˆط²ظٹط¹ ط§ظ„ط¯ط¬ط§ط¬ ظ…ظ† ط§ظ„ظ…ط²ط§ط±ط¹ ط¥ظ„ظ‰ ط§ظ„ظ…ط·ط§ط¹ظ…' },
      { property: 'og:site_name', content: 'DChicken' },
      { property: 'og:locale', content: 'ar_SA' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [
      { rel: 'stylesheet', href: indexCss },
      { rel: 'icon', type: 'image/png', href: '/favicon.png' },
      { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icon-192.png' },
      { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/icon-512.png' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/icon-touch-2026.png' },
      { rel: 'apple-touch-icon', href: '/icon-touch-2026.png' },
      { rel: 'apple-touch-icon-precomposed', href: '/icon-touch-2026.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* MUST be first: sets the theme class before paint so there is no
            flash-of-wrong-theme. Do not move below <HeadContent />. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
        {/*
          WebSite + Organization entity (rendered on every page, once at the root).
          Gives Google's Knowledge Graph + AI answer engines explicit, machine-
          readable identity. Replace name/url and add the brand's real profile
          links to `sameAs` (LinkedIn, GitHub, X, Crunchbase) per app.
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                { '@type': 'WebSite', name: 'DChicken', url: '/' },
                { '@type': 'Organization', name: 'DChicken | آفاق الرغد', url: '/', sameAs: [] },
              ],
            }),
          }}
        />
        
        <script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          defer
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.OneSignalDeferred = window.OneSignalDeferred || [];
window.OneSignalDeferred.push(async function(OneSignal) {
  await OneSignal.init({ appId: '7fea93f9-59a6-4c94-8b82-1ae65d133ff6' });
});`,
          }}
        />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={0}>
            <Toaster />
            {/*
              Full-bleed by default â€” NO app chrome. Child routes render directly.
              SaaS / dashboard app? Opt in by adding a `src/routes/_app.tsx` layout
              route with pages under `src/routes/_app/`. Landing pages, marketing
              sites, content, and games stay full-bleed.
            */}
            {children}
          </TooltipProvider>
        </QueryClientProvider>
        <Analytics />
        <SpeedInsights />
        <Scripts />
      </body>
    </html>
  )
}
