import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import {
  Disc3,
  Home,
  Library,
  LogIn,
  LogOut,
  Music2,
  PenLine,
  Plus,
  ShieldCheck,
  UserRound,
  UserRoundPlus,
  Users,
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
  /** Retained for existing callers; the footer now always follows normal flow. */
  footerBelowFold?: boolean
  width?: "narrow" | "wide"
}) {
  return getPublicRuntimeConfig() ? (
    <ConfiguredPageShell width={width}>{children}</ConfiguredPageShell>
  ) : (
    <ShellFrame width={width} current={{ state: "anonymous" }}>
      {children}
    </ShellFrame>
  )
}

type CurrentAccount = FunctionReturnType<typeof api.members.current>
type ShellFrameProps = {
  children: ReactNode
  width: "narrow" | "wide"
  current: CurrentAccount | undefined
}

function ConfiguredPageShell({
  children,
  width,
}: Omit<ShellFrameProps, "current">) {
  const current = useQuery(api.members.current, {})
  return (
    <ShellFrame width={width} current={current}>
      {children}
    </ShellFrame>
  )
}

function ShellFrame({ children, width, current }: ShellFrameProps) {
  const { t } = useLocale()
  const account = current && getAccountNavigation(current.state)
  const primary =
    account?.kind === "authenticated"
      ? { href: account.href, label: t(account.labelKey) }
      : undefined

  return (
    <div className="grid min-h-svh grid-rows-[auto_1fr_auto]">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6 lg:gap-6">
          <Link
            to="/"
            className="group mr-auto flex shrink-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:mr-0"
          >
            <span className="grid size-8 place-items-center rounded-xl bg-brand text-sm font-black text-brand-foreground shadow-sm transition-transform group-hover:-rotate-3">
              X
            </span>
            <span className="text-lg font-semibold tracking-tight">
              {PRODUCT_NAME}
            </span>
          </Link>

          <nav
            aria-label={t("navigation.menu")}
            className="mr-auto hidden items-center gap-1 lg:flex"
          >
            <DesktopLink to="/">{t("navigation.home")}</DesktopLink>
            <DesktopLink to="/songs">{t("studio.songs")}</DesktopLink>
            <DesktopLink to="/albums">{t("studio.albums")}</DesktopLink>
            <DesktopLink to="/artists">{t("navigation.artists")}</DesktopLink>
          </nav>

          <div className="flex items-center gap-0.5">
            <LocaleMenu />
            <ThemeMenu />
            <ConfiguredAccountNavigation current={current} />
          </div>
        </div>
      </header>

      <main
        className={cn(
          "mx-auto flex w-full min-w-0 flex-col gap-6 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-8 lg:pb-8",
          width === "wide" ? "max-w-6xl" : "max-w-2xl"
        )}
      >
        {children}
      </main>

      <footer className="hidden border-t lg:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6 text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {PRODUCT_NAME}
          </p>
          <p>{t("home.eyebrow")}</p>
        </div>
      </footer>
      <BottomNavigation
        primary={primary}
        role={current?.state === "ready" ? current.member.role : undefined}
        pending={current === undefined}
      />
    </div>
  )
}

function DesktopLink({
  children,
  to,
}: {
  children: ReactNode
  to: "/" | "/songs" | "/albums" | "/artists"
}) {
  return (
    <Button asChild variant="ghost">
      <Link
        to={to}
        activeOptions={{ exact: to === "/" }}
        activeProps={{ "aria-current": "page", "data-active": true }}
        className="data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
      >
        {children}
      </Link>
    </Button>
  )
}

function ConfiguredAccountNavigation({
  current,
}: {
  current: CurrentAccount | undefined
}) {
  const { t } = useLocale()

  if (current === undefined) {
    return (
      <div aria-label={t("common.loadingAccount")} role="status">
        <Skeleton className="size-9 rounded-full" />
      </div>
    )
  }

  const navigation = getAccountNavigation(current.state)
  if (navigation.kind === "anonymous") return <AccountNavigation />

  async function signOut() {
    try {
      const result = await authClient.signOut()
      if (result.error) throw result.error
      window.location.assign("/")
    } catch (caught) {
      toast.error(t("toast.signOutError"), {
        description: getErrorMessage(caught, t),
      })
    }
  }

  return (
    <AccountNavigation
      primary={{ href: navigation.href, label: t(navigation.labelKey) }}
      initial={
        current.state === "ready"
          ? current.profile.displayName.trim().slice(0, 1).toUpperCase()
          : undefined
      }
      role={current.state === "ready" ? current.member.role : undefined}
      showModeration={current.state === "ready" && current.member.isAdmin}
      onSignOut={signOut}
    />
  )
}

type AccountNavigationProps = {
  primary?: {
    href: "/auth/verify-email" | "/onboarding" | "/profile"
    label: string
  }
  initial?: string
  role?: "artist" | "fan"
  showModeration?: boolean
  onSignOut?: () => Promise<void>
}

function AccountNavigation({
  primary,
  initial,
  role,
  showModeration = false,
  onSignOut,
}: AccountNavigationProps) {
  const { t } = useLocale()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={primary ? "default" : "outline"}
            size="icon-lg"
            className="rounded-full"
            aria-label={t("navigation.account")}
          >
            {initial ? (
              <span aria-hidden="true">{initial}</span>
            ) : (
              <UserRound aria-hidden="true" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{PRODUCT_NAME}</DropdownMenuLabel>
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
            {role === "artist" ? (
              <DropdownMenuItem asChild>
                <Link to="/studio">
                  <PenLine />
                  {t("navigation.studio")}
                </Link>
              </DropdownMenuItem>
            ) : null}
            {role === "fan" ? (
              <>
                <DropdownMenuItem asChild>
                  <Link to="/community/mine">
                    <Library />
                    {t("community.mine")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/community/new">
                    <Plus />
                    {t("community.publish")}
                  </Link>
                </DropdownMenuItem>
              </>
            ) : null}
            {showModeration ? (
              <DropdownMenuItem asChild>
                <Link to="/admin/community">
                  <ShieldCheck />
                  {t("community.moderation")}
                </Link>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link to="/songs">
                <Music2 />
                {t("studio.songs")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/albums">
                <Disc3 />
                {t("studio.albums")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/artists">
                <Users />
                {t("navigation.artists")}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {onSignOut ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => void onSignOut()}>
                  <LogOut />
                  {t("navigation.signOut")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

function BottomNavigation({
  primary,
  role,
  pending = false,
}: Pick<AccountNavigationProps, "primary" | "role"> & { pending?: boolean }) {
  const { t } = useLocale()
  const tool =
    role === "artist"
      ? {
          href: "/studio" as const,
          label: t("navigation.studio"),
          icon: PenLine,
        }
      : role === "fan"
        ? {
            href: "/community/mine" as const,
            label: t("navigation.contributions"),
            icon: Library,
          }
        : {
            href: "/artists" as const,
            label: t("navigation.artists"),
            icon: Users,
          }

  return (
    <nav
      aria-label={t("navigation.mobile")}
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <BottomLink href="/" label={t("navigation.home")} icon={Home} />
      <BottomLink href="/songs" label={t("studio.songs")} icon={Music2} />
      {pending ? (
        <div
          className="col-span-2 grid grid-cols-2"
          aria-label={t("common.loadingAccount")}
          role="status"
        >
          {[0, 1].map((slot) => (
            <div key={slot} className="grid h-16 place-items-center">
              <Skeleton className="h-9 w-14" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <BottomLink href={tool.href} label={tool.label} icon={tool.icon} />
          <BottomLink
            href={primary?.href ?? "/auth/sign-in"}
            label={
              primary?.href === "/profile"
                ? t("navigation.account")
                : (primary?.label ?? t("navigation.signIn"))
            }
            icon={UserRound}
          />
        </>
      )}
    </nav>
  )
}

function BottomLink({
  href,
  label,
  icon: Icon,
}: {
  href:
    | "/"
    | "/songs"
    | "/artists"
    | "/studio"
    | "/community/mine"
    | "/auth/sign-in"
    | "/auth/verify-email"
    | "/onboarding"
    | "/profile"
  label: string
  icon: typeof Home
}) {
  return (
    <Link
      to={href}
      activeOptions={{ exact: href === "/" }}
      activeProps={{ "aria-current": "page", "data-active": true }}
      className="flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-center text-xs text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="line-clamp-2 break-words">{label}</span>
    </Link>
  )
}
