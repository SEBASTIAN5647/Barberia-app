import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const CONVEX_URL = import.meta.env.VITE_CONVEX_URL
  if (!CONVEX_URL) {
    throw new Error(
      'Falta VITE_CONVEX_URL. Corre `npx convex dev` y copia la URL que te da a tu archivo .env.local (ver README).',
    )
  }

  // A fresh ConvexQueryClient (and its underlying ConvexReactClient) per
  // getRouter() call -- once per request on the server, once on client boot
  // -- so requests from different visitors never share auth/subscription
  // state. It's handed down through router context (not a top-level
  // `Wrap`) because the Clerk provider below needs to render *inside* the
  // routed tree to access router hooks like useLocation.
  const convexQueryClient = new ConvexQueryClient(CONVEX_URL)

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  })
  convexQueryClient.connect(queryClient)

  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    context: { queryClient, convexClient: convexQueryClient.convexClient },
  })

  return routerWithQueryClient(router, queryClient)
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
