import type { ReactNode } from "react"

import { cn } from "@lyrx/ui/lib/utils"

import { LogoMark, Wordmark } from "./brand"
import { PageMain, useInsideAppChrome } from "./page-main"

/**
 * Provider-free shell for route pending, error and not-found boundaries.
 * TanStack Router may render these before RootApplication mounts the locale,
 * auth and Convex providers, so this component must not consume any of them.
 * When the persistent chrome is already mounted it renders only the body.
 */
export function RouteBoundaryShell({
  children,
  width = "narrow",
}: {
  children: ReactNode
  width?: "narrow" | "wide"
}) {
  // Below the root chrome, keep the real navigation in place and only swap
  // the page body; otherwise every slow navigation flashed a second header.
  if (useInsideAppChrome()) return <PageMain width={width}>{children}</PageMain>
  return (
    <div className="grid min-h-svh grid-rows-[auto_1fr]">
      <header className="pt-4">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <a
            href="/"
            className="flex h-14 items-center gap-2.5 rounded-full border bg-background px-4 shadow-sm"
          >
            <LogoMark />
            <Wordmark className="text-xl font-semibold tracking-tight" />
          </a>
        </div>
      </header>
      <main
        className={cn(
          "mx-auto flex w-full flex-col justify-center gap-6 px-4 py-8 sm:px-6",
          width === "wide" ? "max-w-6xl" : "max-w-2xl"
        )}
      >
        {children}
      </main>
    </div>
  )
}
