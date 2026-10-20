import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import type { ReactNode } from "react"

import { PRODUCT_NAME } from "@lyrx/shared"
import { Toaster } from "@lyrx/ui/components/sonner"
import appCss from "@lyrx/ui/globals.css?url"

import { BackendProvider } from "@/components/backend-provider"

const getInitialAuthToken = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getAuthToken } = await import("@/lib/auth-server")
    return await getAuthToken()
  }
)

export const Route = createRootRoute({
  beforeLoad: async () => ({ token: await getInitialAuthToken() }),
  component: RootApplication,
  head: () => ({
    links: [
      {
        href: appCss,
        rel: "stylesheet",
      },
      {
        href: "/favicon.svg",
        rel: "icon",
        type: "image/svg+xml",
      },
      {
        href: "/manifest.json",
        rel: "manifest",
      },
    ],
    meta: [
      { charSet: "utf-8" },
      {
        content: "width=device-width, initial-scale=1",
        name: "viewport",
      },
      { title: `${PRODUCT_NAME} — Comptes et profils` },
      {
        content: "Comptes et profils de la plateforme musicale Lyr'X.",
        name: "description",
      },
    ],
  }),
  notFoundComponent: () => (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center gap-3 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Page introuvable
      </h1>
      <p className="text-muted-foreground">
        Cette adresse ne correspond à aucune page de {PRODUCT_NAME}.
      </p>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootApplication() {
  const { token } = Route.useRouteContext()
  return (
    <BackendProvider initialToken={token}>
      <Outlet />
    </BackendProvider>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster position="top-center" theme="system" richColors />
        <Scripts />
      </body>
    </html>
  )
}
