import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { PRODUCT_NAME } from "@lyrx/shared"
import { Button } from "@lyrx/ui/components/button"
import { cn } from "@lyrx/ui/lib/utils"

export function PageShell({
  children,
  width = "narrow",
}: {
  children: ReactNode
  width?: "narrow" | "wide"
}) {
  return (
    <main className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            {PRODUCT_NAME}
          </Link>
          <nav aria-label="Compte" className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth/sign-in">Connexion</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth/sign-up">Créer un compte</Link>
            </Button>
          </nav>
        </div>
      </header>
      <div
        className={cn(
          "mx-auto flex flex-col gap-6 px-6 py-10",
          width === "wide" ? "max-w-5xl" : "max-w-xl"
        )}
      >
        {children}
      </div>
    </main>
  )
}
