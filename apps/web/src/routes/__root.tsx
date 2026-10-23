import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useEffect } from "react"
import type { ReactNode } from "react"

import { DEFAULT_LOCALE, formatMessage, UI_MESSAGES } from "@lyrx/shared"
import { Toaster } from "@lyrx/ui/components/sonner"
import { ThemeProvider } from "@lyrx/ui/components/theme-provider"
import appCss from "@lyrx/ui/globals.css?url"

import { BackendProvider } from "@/app/backend-provider"
import { LocaleProvider, useLocale } from "@/app/locale-provider"
import { RouteBoundaryShell } from "@/app/route-boundary-shell"
import type { RouterContext } from "@/router"

const getInitialAuthToken = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getAuthToken } = await import("@/lib/auth-server")
    return await getAuthToken()
  }
)

export const Route = createRootRouteWithContext<RouterContext>()({
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
      { title: UI_MESSAGES.fr["meta.title"] },
      {
        content: UI_MESSAGES.fr["meta.description"],
        name: "description",
      },
    ],
  }),
  notFoundComponent: NotFoundPage,
  shellComponent: RootDocument,
})

function RootApplication() {
  const { convexClient, token } = Route.useRouteContext()
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="lyrx-theme"
    >
      <LocaleProvider>
        <LocalizedDocumentMetadata />
        <BackendProvider client={convexClient} initialToken={token}>
          <Outlet />
        </BackendProvider>
        <Toaster position="top-center" richColors />
      </LocaleProvider>
    </ThemeProvider>
  )
}

function LocalizedDocumentMetadata() {
  const { t } = useLocale()

  useEffect(() => {
    document.title = t("meta.title")
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t("meta.description"))
  }, [t])

  return null
}

function NotFoundPage() {
  // Root not-found rendering can happen before RootApplication mounts the
  // locale provider, so this boundary must use the documented default locale.
  const title = formatMessage(DEFAULT_LOCALE, "notFound.title")
  const description = formatMessage(DEFAULT_LOCALE, "notFound.description")
  return (
    <RouteBoundaryShell>
      <section className="flex min-h-[50svh] flex-col justify-center gap-3">
        <p className="font-mono text-sm text-primary">404</p>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </section>
    </RouteBoundaryShell>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
