import { useLocale } from "@/app/locale-provider"
import { AlbumCard, SongCard } from "@/features/discovery/discovery-cards"
import {
  DiscoveryEmpty,
  DiscoveryLoading,
} from "@/features/discovery/discovery-states"
import { api } from "@lyrx/backend/convex/_generated/api"
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
import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { ExternalLink } from "lucide-react"

import type { Profile } from "./profile-header"

export function ArtistCatalogue({ profile }: { profile: Profile }) {
  const { t } = useLocale()
  const catalogue = useQuery(api.discovery.read.artistByHandle, {
    handle: profile.handle,
  })
  if (!catalogue?.ready) return <DiscoveryLoading />
  return (
    <Tabs defaultValue="songs" className="gap-6">
      <TabsList
        variant="line"
        className="w-full justify-start border-b border-border"
      >
        <TabsTrigger value="songs" className="min-w-0 flex-1 px-1 sm:px-4">
          <span className="truncate">
            {t("discovery.songs")} · {catalogue.songCount}
          </span>
        </TabsTrigger>
        <TabsTrigger value="albums" className="min-w-0 flex-1 px-1 sm:px-4">
          <span className="truncate">
            {t("discovery.albums")} · {catalogue.albumCount}
          </span>
        </TabsTrigger>
        <TabsTrigger value="about" className="min-w-0 flex-1 px-1 sm:px-4">
          <span className="truncate">{t("discovery.about")}</span>
        </TabsTrigger>
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
