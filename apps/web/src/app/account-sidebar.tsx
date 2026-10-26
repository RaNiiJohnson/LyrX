import { Link } from "@tanstack/react-router"
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
import { useRef, useState, type ReactNode } from "react"

import { PRODUCT_NAME } from "@lyrx/shared"
import { Button } from "@lyrx/ui/components/button"
import { Separator } from "@lyrx/ui/components/separator"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@lyrx/ui/components/sheet"
import { Spinner } from "@lyrx/ui/components/spinner"

import { useLocale } from "./locale-provider"

export type AccountNavigationProps = {
  primary?: {
    href: "/auth/verify-email" | "/onboarding" | "/profile"
    label: string
  }
  initial?: string
  displayName?: string
  role?: "artist" | "fan"
  showModeration?: boolean
  onSignOut?: () => Promise<void>
}

export function AccountSidebar({
  primary,
  initial,
  displayName,
  role,
  showModeration = false,
  onSignOut,
}: AccountNavigationProps) {
  const { t } = useLocale()
  const [signingOut, setSigningOut] = useState(false)
  const title = useRef<HTMLHeadingElement>(null)

  async function signOut() {
    if (!onSignOut || signingOut) return
    setSigningOut(true)
    try {
      await onSignOut()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
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
      </SheetTrigger>
      <SheetContent
        closeLabel={t("navigation.closeMenu")}
        className="gap-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          title.current?.focus()
        }}
      >
        <SheetHeader className="gap-2 px-6 pt-8 pr-14 pb-6">
          <SheetTitle ref={title} tabIndex={-1}>
            {t("navigation.account")}
          </SheetTitle>
          <SheetDescription className="break-words">
            {displayName ?? PRODUCT_NAME}
          </SheetDescription>
        </SheetHeader>
        <Separator />

        <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-6 py-6">
          <SidebarSection label={t("navigation.explore")}>
            <SidebarLink to="/" icon={Home}>
              {t("navigation.home")}
            </SidebarLink>
            <SidebarLink to="/songs" icon={Music2}>
              {t("studio.songs")}
            </SidebarLink>
            <SidebarLink to="/albums" icon={Disc3}>
              {t("studio.albums")}
            </SidebarLink>
            <SidebarLink to="/artists" icon={Users}>
              {t("navigation.artists")}
            </SidebarLink>
          </SidebarSection>

          <SidebarSection label={t("navigation.account")}>
            {primary ? (
              <SidebarLink to={primary.href} icon={UserRound}>
                {primary.label}
              </SidebarLink>
            ) : (
              <>
                <SidebarLink to="/auth/sign-in" icon={LogIn} prominent>
                  {t("navigation.signIn")}
                </SidebarLink>
                <SidebarLink to="/auth/sign-up" icon={UserRoundPlus}>
                  {t("navigation.createAccount")}
                </SidebarLink>
              </>
            )}
          </SidebarSection>

          {role === "artist" ? (
            <SidebarSection label={t("navigation.artistTools")}>
              <SidebarLink to="/studio/songs/new" icon={Plus} prominent>
                {t("studio.createSong")}
              </SidebarLink>
              <SidebarLink to="/studio" icon={PenLine}>
                {t("navigation.studio")}
              </SidebarLink>
            </SidebarSection>
          ) : null}

          {role === "fan" ? (
            <SidebarSection label={t("navigation.fanTools")}>
              <SidebarLink to="/community/new" icon={Plus} prominent>
                {t("community.publish")}
              </SidebarLink>
              <SidebarLink to="/community/mine" icon={Library}>
                {t("community.mine")}
              </SidebarLink>
            </SidebarSection>
          ) : null}

          {showModeration ? (
            <SidebarSection label={t("navigation.administration")}>
              <SidebarLink to="/admin/community" icon={ShieldCheck}>
                {t("community.moderation")}
              </SidebarLink>
            </SidebarSection>
          ) : null}
        </div>

        {onSignOut ? (
          <>
            <Separator />
            <SheetFooter className="px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <Button
                variant="outline"
                className="h-11 w-full justify-start gap-3"
                disabled={signingOut}
                onClick={() => void signOut()}
              >
                {signingOut ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <LogOut data-icon="inline-start" />
                )}
                {t("navigation.signOut")}
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function SidebarSection({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <nav aria-label={label} className="flex flex-col gap-3">
      <h2 className="px-3 text-xs font-medium tracking-wide text-muted-foreground">
        {label}
      </h2>
      <div className="flex flex-col gap-1.5">{children}</div>
    </nav>
  )
}

function SidebarLink({
  to,
  icon: Icon,
  prominent = false,
  children,
}: {
  to:
    | "/"
    | "/songs"
    | "/albums"
    | "/artists"
    | "/auth/sign-in"
    | "/auth/sign-up"
    | "/auth/verify-email"
    | "/onboarding"
    | "/profile"
    | "/studio"
    | "/studio/songs/new"
    | "/community/new"
    | "/community/mine"
    | "/admin/community"
  icon: typeof Home
  prominent?: boolean
  children: ReactNode
}) {
  return (
    <SheetClose asChild>
      <Button
        asChild
        variant={prominent ? "default" : "ghost"}
        className="h-auto min-h-11 w-full justify-start gap-3 py-3 whitespace-normal"
      >
        <Link
          to={to}
          activeOptions={{ exact: true }}
          activeProps={{ "aria-current": "page" }}
        >
          <Icon data-icon="inline-start" aria-hidden="true" />
          {children}
        </Link>
      </Button>
    </SheetClose>
  )
}
