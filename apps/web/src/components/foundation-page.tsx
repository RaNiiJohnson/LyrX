import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { BookOpenText, MessageCircleHeart, UsersRound } from "lucide-react"

import { api } from "@lyrx/backend/convex/_generated/api"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Badge } from "@lyrx/ui/components/badge"
import { Button } from "@lyrx/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { toast } from "@lyrx/ui/lib/toast"

import { authClient } from "@/lib/auth-client"
import { getPublicRuntimeConfig } from "@/lib/runtime-config"

import { useLocale } from "./locale-provider"
import { PageShell } from "./page-shell"

export function FoundationPage() {
  const { t } = useLocale()

  return (
    <PageShell width="wide">
      <section className="grid items-center gap-10 py-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:py-16">
        <div className="flex flex-col items-start gap-6">
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            {t("home.eyebrow")}
          </Badge>
          <div className="flex flex-col gap-4">
            <h1 className="max-w-3xl text-4xl leading-[1.05] font-semibold tracking-[-0.04em] text-balance sm:text-6xl lg:text-7xl">
              {t("home.title")}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-pretty text-muted-foreground">
              {t("home.description")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth/sign-up">{t("home.heroAction")}</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/auth/sign-in">{t("home.heroSecondaryAction")}</Link>
            </Button>
          </div>
        </div>

        <div className="relative min-h-[28rem] overflow-hidden rounded-3xl border bg-muted shadow-sm lg:min-h-[32rem]">
          <img
            src="/images/lyrx-songwriter-hero.webp"
            alt={t("home.heroImageAlt")}
            width={1536}
            height={1024}
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-x-4 bottom-4 sm:right-auto sm:left-5 sm:w-[21rem]">
            {getPublicRuntimeConfig() ? (
              <ConfiguredAccountCard />
            ) : (
              <MissingBackend />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 border-t pt-8 md:grid-cols-3 md:pt-10">
        <Feature
          icon={BookOpenText}
          title={t("home.featureLyricsTitle")}
          description={t("home.featureLyricsDescription")}
        />
        <Feature
          icon={MessageCircleHeart}
          title={t("home.featureMeaningTitle")}
          description={t("home.featureMeaningDescription")}
        />
        <Feature
          icon={UsersRound}
          title={t("home.featureCommunityTitle")}
          description={t("home.featureCommunityDescription")}
        />
      </section>
    </PageShell>
  )
}

function Feature({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BookOpenText
  title: string
  description: string
}) {
  return (
    <article>
      <Card className="h-full">
        <CardHeader className="gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-secondary text-secondary-foreground">
            <Icon aria-hidden="true" />
          </div>
          <CardTitle>
            <h2>{title}</h2>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </article>
  )
}

function MissingBackend() {
  const { t } = useLocale()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("home.backendTitle")}</CardTitle>
        <CardDescription>{t("home.backendDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <MissingBackendNotice />
      </CardContent>
      <CardFooter>
        <Button asChild>
          <Link to="/auth/sign-in">{t("home.backendAction")}</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export function MissingBackendNotice() {
  const { t } = useLocale()
  return (
    <Alert>
      <AlertTitle>{t("home.backendNoticeTitle")}</AlertTitle>
      <AlertDescription>{t("home.backendNoticeDescription")}</AlertDescription>
    </Alert>
  )
}

function ConfiguredAccountCard() {
  const current = useQuery(api.members.current, {})
  const { t } = useLocale()
  if (current === undefined) return <ConfiguredAccountCardSkeleton />

  if (current.state === "anonymous") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("home.welcomeTitle")}</CardTitle>
          <CardDescription>{t("home.welcomeDescription")}</CardDescription>
        </CardHeader>
        <CardFooter className="flex-wrap gap-2">
          <Button asChild>
            <Link to="/auth/sign-in">{t("navigation.signIn")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/auth/sign-up">{t("navigation.createAccount")}</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (current.state === "email-unverified") {
    return (
      <Alert>
        <AlertTitle>{t("home.emailUnverifiedTitle")}</AlertTitle>
        <AlertDescription>
          {t("home.emailUnverifiedDescription")}{" "}
          <Link to="/auth/verify-email">{t("home.emailUnverifiedLink")}</Link>
        </AlertDescription>
      </Alert>
    )
  }

  if (current.state === "onboarding-required") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("home.onboardingTitle")}</CardTitle>
          <CardDescription>{t("home.onboardingDescription")}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild>
            <Link to="/onboarding">{t("navigation.continue")}</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (current.state === "suspended") {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("home.suspendedTitle")}</AlertTitle>
        <AlertDescription>{t("home.suspendedDescription")}</AlertDescription>
      </Alert>
    )
  }

  async function signOut() {
    try {
      const result = await authClient.signOut()
      if (result.error) throw result.error
      window.location.assign("/")
    } catch {
      toast.error(t("toast.signOutError"))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("home.readyGreeting", { name: current.profile.displayName })}
        </CardTitle>
        <CardDescription>
          {t("home.readyDescription", {
            role:
              current.member.role === "artist"
                ? t("common.artist")
                : t("common.fan"),
            handle: current.profile.handle,
          })}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex-wrap gap-2">
        <Button asChild>
          <Link to="/profile">{t("navigation.myProfile")}</Link>
        </Button>
        <Button type="button" variant="outline" onClick={signOut}>
          {t("navigation.signOut")}
        </Button>
      </CardFooter>
    </Card>
  )
}

function ConfiguredAccountCardSkeleton() {
  const { t } = useLocale()
  return (
    <Card aria-label={t("common.loadingAccount")}>
      <CardHeader className="gap-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-4/5" />
      </CardHeader>
      <CardFooter className="gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-32" />
      </CardFooter>
    </Card>
  )
}
