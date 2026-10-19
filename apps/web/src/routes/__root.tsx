import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { PRODUCT_NAME } from "@lyrx/shared"
import appCss from "@lyrx/ui/globals.css?url"

export const Route = createRootRoute({
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
      { title: `${PRODUCT_NAME} — Fondation web` },
      {
        content: "Fondation technique de la plateforme musicale Lyr'X.",
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

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
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
