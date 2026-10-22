import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import {
  ArrowRight,
  BookOpenText,
  MessageCircleHeart,
  UsersRound,
} from "lucide-react"

import { Badge } from "@lyrx/ui/components/badge"
import { api } from "@lyrx/backend/convex/_generated/api"
import { Button } from "@lyrx/ui/components/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import { Skeleton } from "@lyrx/ui/components/skeleton"

import { getPublicRuntimeConfig } from "@/lib/runtime-config"
import { getAccountNavigation } from "@/lib/account-navigation"
import { useLocale } from "@/app/locale-provider"

export function FoundationPage() {
  const { t } = useLocale()

  return (
    <>
      <section className="relative isolate flex min-h-[29rem] items-center justify-center overflow-hidden rounded-3xl bg-muted px-5 py-10 text-center shadow-sm sm:min-h-[32rem] sm:px-10 sm:py-12 lg:min-h-[34rem]">
        <img
          src="/images/lyrx-songwriter-hero.webp"
          alt={t("home.heroImageAlt")}
          width={1536}
          height={1024}
          fetchPriority="high"
          className="absolute inset-0 -z-20 size-full object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-brand-foreground/65"
        />

        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-hero-foreground">
          <Badge variant="secondary">{t("home.eyebrow")}</Badge>
          <div className="flex flex-col items-center gap-4">
            <h1 className="max-w-4xl font-serif text-4xl leading-[0.95] font-medium tracking-[-0.04em] text-balance sm:text-6xl lg:text-7xl">
              <span className="block">{t("home.titleLead")}</span>
              <span className="block font-normal italic">
                {t("home.titleEmphasis")}
              </span>
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-pretty text-hero-muted-foreground sm:text-base sm:leading-7">
              {t("home.description")}
            </p>
          </div>
          <HeroActions />
        </div>
      </section>

      <section className="grid gap-4 py-6 md:grid-cols-3 md:py-8">
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
    </>
  )
}

function HeroActions() {
  if (!getPublicRuntimeConfig()) return <AnonymousHeroActions />
  return <ConfiguredHeroActions />
}

function AnonymousHeroActions() {
  const { t } = useLocale()
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <Button asChild size="lg">
        <Link to="/auth/sign-up">
          {t("home.heroAction")}
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
      </Button>
      <Button asChild variant="outline" size="lg">
        <Link to="/auth/sign-in">{t("home.heroSecondaryAction")}</Link>
      </Button>
    </div>
  )
}

function ConfiguredHeroActions() {
  const { t } = useLocale()
  const current = useQuery(api.members.current, {})

  if (current === undefined) {
    return (
      <div className="flex gap-3" aria-label={t("common.loadingAccount")}>
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-28" />
      </div>
    )
  }
  if (current.state === "anonymous") return <AnonymousHeroActions />

  const accountNavigation = getAccountNavigation(current.state)
  if (accountNavigation.kind === "anonymous") return <AnonymousHeroActions />
  const primary =
    current.state === "ready" && current.member.role === "artist"
      ? { to: "/studio" as const, label: t("navigation.studio") }
      : {
          to: accountNavigation.href,
          label: t(accountNavigation.labelKey),
        }

  return (
    <div className="flex flex-wrap justify-center gap-3">
      <Button asChild size="lg">
        <Link to={primary.to}>
          {primary.label}
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
      </Button>
      {current.state === "ready" && current.member.role === "artist" ? (
        <Button asChild variant="outline" size="lg">
          <Link to="/profile">{t("navigation.myProfile")}</Link>
        </Button>
      ) : null}
    </div>
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
