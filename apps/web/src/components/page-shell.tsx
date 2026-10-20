import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import {
  Home,
  LogIn,
  LogOut,
  Menu,
  UserRound,
  UserRoundPlus,
} from "lucide-react"
import type { ReactNode } from "react"

import { api } from "@lyrx/backend/convex/_generated/api"
import { PRODUCT_NAME } from "@lyrx/shared"
import { Button } from "@lyrx/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lyrx/ui/components/dropdown-menu"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { toast } from "@lyrx/ui/lib/toast"
import { cn } from "@lyrx/ui/lib/utils"

import { getAccountNavigation } from "@/lib/account-navigation"
import { authClient } from "@/lib/auth-client"
import { getErrorMessage } from "@/lib/errors"
import { getPublicRuntimeConfig } from "@/lib/runtime-config"

import { LocaleMenu } from "./locale-menu"
import { useLocale } from "./locale-provider"
import { ThemeMenu } from "./theme-menu"

export function PageShell({
  children,
  width = "narrow",
}: {
  children: ReactNode
  width?: "narrow" | "wide"
}) {
  const { t } = useLocale()

  return (
    <div className="grid min-h-svh grid-rows-[auto_1fr_auto]">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link
            to="/"
            className="group mr-auto flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="grid size-8 place-items-center rounded-xl bg-brand text-sm font-black text-white shadow-sm transition-transform group-hover:-rotate-3">
              X
            </span>
            <span className="text-lg font-semibold tracking-tight">
              {PRODUCT_NAME}
            </span>
          </Link>

          <nav aria-label={t("navigation.menu")} className="hidden md:flex">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">{t("navigation.home")}</Link>
            </Button>
          </nav>

          <div className="flex items-center gap-0.5">
            <LocaleMenu />
            <ThemeMenu />
            {getPublicRuntimeConfig() ? (
              <ConfiguredAccountNavigation />
            ) : (
              <AnonymousAccountNavigation />
            )}
          </div>
        </div>
      </header>

      <main
        className={cn(
          "mx-auto flex w-full flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12",
          width === "wide" ? "max-w-6xl" : "max-w-2xl"
        )}
      >
        {children}
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <p>
            © {new Date().getFullYear()} {PRODUCT_NAME}
          </p>
          <p>{t("home.eyebrow")}</p>
        </div>
      </footer>
    </div>
  )
}

function ConfiguredAccountNavigation() {
  const current = useQuery(api.members.current, {})
  const { t } = useLocale()

  if (current === undefined) {
    return (
      <>
        <div
          aria-label={t("common.loadingAccount")}
          className="hidden items-center gap-2 md:flex"
        >
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-24" />
        </div>
        <Skeleton className="size-8 rounded-lg md:hidden" />
      </>
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
      toast.error(t("toast.signOutError"), {
        description: getErrorMessage(caught),
      })
    }
  }

  return (
    <>
      <nav
        aria-label={t("navigation.account")}
        className="hidden items-center gap-1 md:flex"
      >
        <Button asChild size="sm">
          <Link to={navigation.href}>{t(navigation.labelKey)}</Link>
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={signOut}>
          {t("navigation.signOut")}
        </Button>
      </nav>
      <MobileNavigation
        primary={{ href: navigation.href, label: t(navigation.labelKey) }}
        onSignOut={signOut}
      />
    </>
  )
}

function AnonymousAccountNavigation() {
  const { t } = useLocale()

  return (
    <>
      <nav
        aria-label={t("navigation.account")}
        className="hidden items-center gap-1 md:flex"
      >
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth/sign-in">{t("navigation.signIn")}</Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/auth/sign-up">{t("navigation.createAccount")}</Link>
        </Button>
      </nav>
      <MobileNavigation />
    </>
  )
}

function MobileNavigation({
  primary,
  onSignOut,
}: {
  primary?: {
    href: "/auth/verify-email" | "/onboarding" | "/profile"
    label: string
  }
  onSignOut?: () => Promise<void>
}) {
  const { t } = useLocale()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="md:hidden"
          aria-label={t("navigation.openMenu")}
        >
          <Menu aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 md:hidden">
        <DropdownMenuLabel>{PRODUCT_NAME}</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to="/">
              <Home />
              {t("navigation.home")}
            </Link>
          </DropdownMenuItem>
          {primary ? (
            <DropdownMenuItem asChild>
              <Link to={primary.href}>
                <UserRound />
                {primary.label}
              </Link>
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem asChild>
                <Link to="/auth/sign-in">
                  <LogIn />
                  {t("navigation.signIn")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/auth/sign-up">
                  <UserRoundPlus />
                  {t("navigation.createAccount")}
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
        {onSignOut ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void onSignOut()}>
              <LogOut />
              {t("navigation.signOut")}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
