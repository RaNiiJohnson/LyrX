import type { ReactNode } from "react"

import { PRODUCT_NAME } from "@lyrx/shared"
import { cn } from "@lyrx/ui/lib/utils"

/**
 * Provider-free shell for route pending, error and not-found boundaries.
 * TanStack Router may render these before RootApplication mounts the locale,
 * auth and Convex providers, so this component must not consume any of them.
 */
export function RouteBoundaryShell({
  children,
  width = "narrow",
}: {
  children: ReactNode
  width?: "narrow" | "wide"
}) {
  return (
    <div className="grid min-h-svh grid-rows-[auto_1fr]">
      <header className="pt-4">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <a
            href="/"
            className="flex h-14 items-center gap-2.5 rounded-full border bg-background px-4 shadow-sm"
          >
            <span className="grid size-8 place-items-center rounded-xl bg-brand text-sm font-black text-brand-foreground">
              X
            </span>
            <span className="text-lg font-semibold tracking-tight">
              {PRODUCT_NAME}
            </span>
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
