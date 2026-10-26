import { convexQuery } from "@convex-dev/react-query"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import { ExternalLink } from "lucide-react"
import { api } from "@lyrx/backend/convex/_generated/api"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@lyrx/ui/components/avatar"
import { Badge } from "@lyrx/ui/components/badge"
import { Button } from "@lyrx/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lyrx/ui/components/tabs"
import { useLocale } from "@/app/locale-provider"
import { AlbumCard, SongCard } from "@/features/discovery/discovery-cards"
import {
  DiscoveryEmpty,
  DiscoveryLoading,
} from "@/features/discovery/discovery-states"

type Profile = NonNullable<
  FunctionReturnType<typeof api.members.publicByHandle>
>

export function PublicProfile({ handle }: { handle: string }) {
  const { t } = useLocale()
  const { data: profile } = useSuspenseQuery(
    convexQuery(api.members.publicByHandle, { handle })
  )
  if (!profile)
    return (
      <Alert>
        <AlertTitle>{t("profile.publicNotFoundTitle")}</AlertTitle>
        <AlertDescription>
          {t("profile.publicNotFoundDescription")}
        </AlertDescription>
      </Alert>
    )
  return (
    <section className="flex min-w-0 flex-col gap-7">
      {profile.artist?.bannerUrl ? (
        <ProfileBanner src={profile.artist.bannerUrl} />
      ) : null}
      <header className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <Avatar className="size-24 sm:size-32">
          {profile.avatarUrl ? (
            <AvatarImage src={profile.avatarUrl} alt="" />
          ) : null}
          <AvatarFallback>
            {profile.displayName.trim().slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold break-words">
              {profile.displayName}
            </h1>
            <Badge variant="secondary">
              {t(profile.role === "artist" ? "common.artist" : "common.fan")}
            </Badge>
          </div>
          <p className="break-words text-muted-foreground">@{profile.handle}</p>
        </div>
      </header>
      {profile.bio ? (
        <p className="max-w-3xl leading-7 break-words whitespace-pre-wrap">
          {profile.bio}
        </p>
      ) : null}
      {profile.artist ? <ArtistCatalogue profile={profile} /> : null}
    </section>
  )
}

function ProfileBanner({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      className="aspect-3/1 max-h-64 w-full rounded-2xl object-cover"
      onError={(event) => {
        event.currentTarget.hidden = true
      }}
    />
  )
}

function ArtistCatalogue({ profile }: { profile: Profile }) {
  const { t } = useLocale()
  const catalogue = useQuery(api.discovery.read.artistByHandle, {
    handle: profile.handle,
  })
  if (!catalogue?.ready) return <DiscoveryLoading />
  return (
    <Tabs defaultValue="songs" className="gap-6">
      <TabsList variant="line" className="w-full justify-start">
        <TabsTrigger value="songs">
          {t("discovery.songs")} · {catalogue.songCount}
        </TabsTrigger>
        <TabsTrigger value="albums">
          {t("discovery.albums")} · {catalogue.albumCount}
        </TabsTrigger>
        <TabsTrigger value="about">{t("discovery.about")}</TabsTrigger>
      </TabsList>
      <TabsContent value="songs" className="flex flex-col gap-6">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-5">
            {catalogue.songs.length ? (
              <div className="grid gap-x-4 sm:grid-cols-2 sm:gap-y-4">
                {catalogue.songs.map((song) => (
                  <SongCard key={song.id} song={song} />
                ))}
              </div>
            ) : (
              <DiscoveryEmpty />
            )}
            {catalogue.songCount > catalogue.songs.length ? (
              <Button asChild variant="outline" className="self-start">
                <Link
                  to="/songs"
                  search={{ artist: profile.handle, page: 1, sort: "newest" }}
                >
                  {t("discovery.seeAll")}
                </Link>
              </Button>
            ) : null}
          </div>
          <AboutArtist profile={profile} />
        </div>
        {catalogue.albums.length ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold">{t("discovery.albums")}</h2>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {catalogue.albums.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
          </section>
        ) : null}
      </TabsContent>
      <TabsContent value="albums" className="flex flex-col gap-5">
        {catalogue.albums.length ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {catalogue.albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        ) : (
          <DiscoveryEmpty />
        )}
        {catalogue.albumCount > catalogue.albums.length ? (
          <Button asChild variant="outline" className="self-start">
            <Link
              to="/albums"
              search={{ artist: profile.handle, page: 1, sort: "newest" }}
            >
              {t("discovery.seeAll")}
            </Link>
          </Button>
        ) : null}
      </TabsContent>
      <TabsContent value="about">
        <AboutArtist profile={profile} />
      </TabsContent>
    </Tabs>
  )
}

function AboutArtist({ profile }: { profile: Profile }) {
  const { t } = useLocale()
  const artist = profile.artist
  if (!artist) return null
  const socialLinks = [
    { label: "Instagram", url: artist.instagramUrl },
    { label: "Facebook", url: artist.facebookUrl },
    { label: "TikTok", url: artist.tiktokUrl },
    { label: "YouTube", url: artist.youtubeUrl },
    { label: "Spotify", url: artist.spotifyUrl },
    ...artist.customLinks,
  ].filter((link): link is { label: string; url: string } => Boolean(link.url))
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>{t("profile.aboutArtist")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {artist.presentation ? (
          <p className="leading-7 break-words whitespace-pre-wrap text-muted-foreground">
            {artist.presentation}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {socialLinks.map((link) => (
            <Button key={`${link.label}:${link.url}`} asChild variant="outline">
              <a href={link.url} target="_blank" rel="noreferrer">
                {link.label}
                <ExternalLink data-icon="inline-end" />
              </a>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function PublicProfileSkeleton({ label }: { label: string }) {
  return (
    <div aria-label={label} role="status" className="flex flex-col gap-6">
      <div className="flex items-center gap-5">
        <Skeleton className="size-24 rounded-full" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}
