import { createContext, useContext, type ReactNode } from "react"

import { cn } from "@lyrx/ui/lib/utils"

/**
 * True below the persistent application chrome mounted by the root route.
 * Pages and route boundaries then render only their <main>; the header and
 * mobile navigation stay mounted across navigations instead of being
 * recreated (or replaced by a different boundary header) on every route.
 *
 * This is plain React context with a default, so provider-free boundaries can
 * read it safely before the root application has mounted.
 */
export const AppChromeContext = createContext(false)

export function useInsideAppChrome() {
  return useContext(AppChromeContext)
}

export function PageMain({
  children,
  fullBleed = false,
  width = "narrow",
}: {
  children: ReactNode
  fullBleed?: boolean
  width?: "narrow" | "wide"
}) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full min-w-0 flex-col gap-6 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-8 lg:pb-8",
        fullBleed
          ? "col-start-1 row-span-2 row-start-1 max-w-none px-0 pt-0 sm:px-0 sm:pt-0"
          : width === "wide"
            ? "max-w-6xl"
            : "max-w-2xl"
      )}
    >
      {children}
    </main>
  )
}
