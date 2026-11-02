import { useLocale } from "@/app/locale-provider"
import { AlbumCard } from "@/features/discovery/discovery-cards"
import { DiscoveryLoading } from "@/features/discovery/discovery-states"
import { HorizontalRow } from "@/features/discovery/horizontal-row"
import { SongRow } from "@/features/discovery/song-row"
import { api } from "@lyrx/backend/convex/_generated/api"
import { Button } from "@lyrx/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { useQuery } from "convex-helpers/react/cache"
import { ExternalLink } from "lucide-react"

import type { Profile } from "./profile-header"

export function ArtistCatalogue({ profile }: { profile: Profile }) {
  const { t } = useLocale()
  const catalogue = useQuery(api.discovery.read.artistByHandle, {
    handle: profile.handle,
  })
  if (!catalogue?.ready) return <DiscoveryLoading />
  const filter = { artist: profile.handle, page: 1, sort: "newest" } as const
  // Same sections and cards as the home page: cover cards in a carousel for
  // songs, vinyl album cards in a scroll row, each with "See all".
  return (
    <div className="flex min-w-0 flex-col gap-10 sm:gap-14">
      <SongRow
        title={`${t("discovery.songs")} · ${catalogue.songCount}`}
        songs={catalogue.songs}
        seeAllSearch={filter}
      />
      {catalogue.albumCount > 0 ? (
        <HorizontalRow
          title={`${t("discovery.albums")} · ${catalogue.albumCount}`}
          href="/albums"
          seeAllSearch={filter}
        >
          {catalogue.albums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </HorizontalRow>
      ) : null}
      <AboutArtist profile={profile} />
    </div>
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
  if (!artist.presentation && socialLinks.length === 0) return null
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
