import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import type { ReactNode } from "react"

import { api } from "@lyrx/backend/convex/_generated/api"
import { PRODUCT_NAME } from "@lyrx/shared"
import { Button } from "@lyrx/ui/components/button"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { toast } from "@lyrx/ui/lib/toast"
import { cn } from "@lyrx/ui/lib/utils"

import { getAccountNavigation } from "@/lib/account-navigation"
import { authClient } from "@/lib/auth-client"
import { getErrorMessage } from "@/lib/errors"
import { getPublicRuntimeConfig } from "@/lib/runtime-config"

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
          {getPublicRuntimeConfig() ? (
            <ConfiguredAccountNavigation />
          ) : (
            <AnonymousAccountNavigation />
          )}
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

function ConfiguredAccountNavigation() {
  const current = useQuery(api.members.current, {})

  if (current === undefined) {
    return (
      <nav
        aria-label="Chargement du compte"
        className="flex items-center gap-2"
      >
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-28" />
      </nav>
    )
  }

  const navigation = getAccountNavigation(current.state)
  if (navigation.kind === "anonymous") return <AnonymousAccountNavigation />

  async function signOut() {
    try {
      const result = await authClient.signOut()
      if (result.error) throw result.error
      window.location.assign("/")
    } catch (caught) {
      toast.error("Déconnexion impossible", {
        description: getErrorMessage(caught),
      })
    }
  }

  return (
    <nav aria-label="Compte" className="flex items-center gap-2">
      <Button asChild size="sm">
        <Link to={navigation.href}>{navigation.label}</Link>
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={signOut}>
        Se déconnecter
      </Button>
    </nav>
  )
}

function AnonymousAccountNavigation() {
  return (
    <nav aria-label="Compte" className="flex items-center gap-2">
      <Button asChild variant="ghost" size="sm">
        <Link to="/auth/sign-in">Connexion</Link>
      </Button>
      <Button asChild size="sm">
        <Link to="/auth/sign-up">Créer un compte</Link>
      </Button>
    </nav>
  )
}
