import { convexQuery } from "@convex-dev/react-query"
import { useSuspenseQuery } from "@tanstack/react-query"

import { api } from "@lyrx/backend/convex/_generated/api"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@lyrx/ui/components/avatar"
import { Badge } from "@lyrx/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import { Separator } from "@lyrx/ui/components/separator"
import { Skeleton } from "@lyrx/ui/components/skeleton"

import { useLocale } from "@/app/locale-provider"

export function PublicProfile({ handle }: { handle: string }) {
  const { t } = useLocale()
  const { data: profile } = useSuspenseQuery(
    convexQuery(api.members.publicByHandle, { handle })
  )
  if (!profile) {
    return (
      <Alert>
        <AlertTitle>{t("profile.publicNotFoundTitle")}</AlertTitle>
        <AlertDescription>
          {t("profile.publicNotFoundDescription")}
        </AlertDescription>
      </Alert>
    )
  }

  const initials = profile.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()

  return (
    <Card>
      {profile.artist?.bannerUrl ? (
        <img
          src={profile.artist.bannerUrl}
          alt=""
          className="aspect-3/1 w-full rounded-t-xl object-cover"
        />
      ) : null}
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar size="lg">
            {profile.avatarUrl ? (
              <AvatarImage src={profile.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>{profile.displayName}</CardTitle>
            <CardDescription>@{profile.handle}</CardDescription>
          </div>
          <Badge variant="secondary">
            {profile.role === "artist" ? t("common.artist") : t("common.fan")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {profile.bio ? <p className="leading-7">{profile.bio}</p> : null}
        {profile.artist ? (
          <>
            <Separator />
            <section className="flex flex-col gap-3">
              <h2 className="font-medium">{t("profile.aboutArtist")}</h2>
              {profile.artist.presentation ? (
                <p className="leading-7 text-muted-foreground">
                  {profile.artist.presentation}
                </p>
              ) : null}
              {profile.artist.instagramUrl ? (
                <a
                  className="w-fit underline"
                  href={profile.artist.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Instagram
                </a>
              ) : null}
              {profile.artist.facebookUrl ? (
                <a
                  className="w-fit underline"
                  href={profile.artist.facebookUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Facebook
                </a>
              ) : null}
              {profile.artist.tiktokUrl ? (
                <a
                  className="w-fit underline"
                  href={profile.artist.tiktokUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  TikTok
                </a>
              ) : null}
              {profile.artist.youtubeUrl ? (
                <a
                  className="w-fit underline"
                  href={profile.artist.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  YouTube
                </a>
              ) : null}
              {profile.artist.spotifyUrl ? (
                <a
                  className="w-fit underline"
                  href={profile.artist.spotifyUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Spotify
                </a>
              ) : null}
              {profile.artist.customLinks.map((link) => (
                <a
                  key={link.url}
                  className="w-fit underline"
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {link.label}
                </a>
              ))}
            </section>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function PublicProfileSkeleton() {
  const { t } = useLocale()
  return (
    <Card aria-label={t("common.loadingPublicProfile")}>
      <Skeleton className="aspect-[3/1] w-full rounded-b-none" />
      <CardHeader>
        <div className="flex items-center gap-4">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  )
}
