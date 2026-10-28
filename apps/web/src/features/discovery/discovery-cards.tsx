import { useLocale } from "@/app/locale-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@lyrx/ui/components/avatar"
import { Badge } from "@lyrx/ui/components/badge"
import { cn } from "@lyrx/ui/lib/utils"
import { Link } from "@tanstack/react-router"
import { Disc3, Music2 } from "lucide-react"
import { useState } from "react"

export type DiscoverySong = {
  id: string
  origin: "artist" | "community"
  title: string
  primaryArtist: string
  artworkUrl: string | null
  href: string
}
export type DiscoveryAlbum = {
  id: string
  title: string
  artistName: string
  artistHandle: string
  artworkUrl: string | null
  href: string
}
export type DiscoveryArtist = {
  handle: string
  displayName: string
  avatarUrl: string | null
  songCount: number
  albumCount: number
  href: string
}

export function CoverImage({
  src,
  album = false,
  className,
  label,
}: {
  src: string | null
  album?: boolean
  className?: string
  label?: string
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const Icon = album ? Disc3 : Music2
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-xl bg-muted text-muted-foreground",
        className
      )}
    >
      {src && src !== failedSrc ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          draggable={false}
          className="size-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : label ? (
        <span aria-hidden="true" className="font-serif text-5xl">
          {label.trim().slice(0, 1).toUpperCase()}
        </span>
      ) : (
        <Icon className="size-7" aria-hidden="true" />
      )}
    </div>
  )
}

export function SongCard({
  song,
  presentation = "row",
}: {
  song: DiscoverySong
  presentation?: "row" | "cover"
}) {
  const { t } = useLocale()
  if (presentation === "cover")
    return (
      <Link
        to={song.href}
        className="group flex min-w-0 flex-col gap-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="relative w-full">
          <CoverImage
            src={song.artworkUrl}
            label={song.title}
            className="aspect-square w-full bg-linear-to-br from-brand/35 via-muted to-primary/25 text-foreground"
          />
          <Badge
            variant="secondary"
            className="absolute top-2 left-2 max-w-[calc(100%-1rem)] border-hero-foreground/10 bg-brand-foreground/80 text-hero-foreground"
          >
            {t(
              song.origin === "community"
                ? "discovery.sourceCommunity"
                : "discovery.sourceArtist"
            )}
          </Badge>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="line-clamp-2 font-semibold wrap-break-word group-hover:underline">
            {song.title}
          </h3>
          <p className="line-clamp-2 text-sm wrap-break-word text-muted-foreground">
            {song.primaryArtist}
          </p>
        </div>
      </Link>
    )
  return (
    <Link
      to={song.href}
      className="group flex min-w-0 items-center gap-4 border-b py-5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:rounded-2xl sm:border sm:bg-card sm:p-5"
    >
      <CoverImage src={song.artworkUrl} className="size-16" />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
        <h3 className="line-clamp-2 font-semibold wrap-break-word group-hover:underline">
          {song.title}
        </h3>
        <p className="line-clamp-2 text-sm wrap-break-word text-muted-foreground">
          {song.primaryArtist}
        </p>
        <Badge variant={song.origin === "community" ? "secondary" : "outline"}>
          {t(
            song.origin === "community"
              ? "discovery.sourceCommunity"
              : "discovery.sourceArtist"
          )}
        </Badge>
      </div>
    </Link>
  )
}

export function AlbumCard({ album }: { album: DiscoveryAlbum }) {
  return (
    <Link
      to={album.href}
      className="group flex min-w-0 flex-col gap-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="relative isolate w-full pr-[15%]">
        <div
          aria-hidden="true"
          className="absolute top-[8%] right-0 -z-10 grid aspect-square w-[72%] place-items-center rounded-full border border-hero-foreground/15 bg-brand-foreground shadow-md"
          style={{
            backgroundImage:
              "repeating-radial-gradient(circle, transparent 0px, transparent 3px, color-mix(in oklab, var(--hero-foreground) 12%, transparent) 3.5px, transparent 4px)",
          }}
        >
          <span className="grid size-[30%] place-items-center rounded-full border border-hero-foreground/15 bg-muted">
            <span className="size-2 rounded-full bg-brand-foreground" />
          </span>
        </div>
        <CoverImage
          src={album.artworkUrl}
          label={album.title}
          album
          className="aspect-square w-full rounded-lg bg-linear-to-br from-primary/35 via-muted to-brand/25 text-foreground shadow-md"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="line-clamp-2 font-semibold wrap-break-word group-hover:underline">
          {album.title}
        </h3>
        <p className="line-clamp-2 text-sm wrap-break-word text-muted-foreground">
          {album.artistName}
        </p>
      </div>
    </Link>
  )
}

export function ArtistCard({ artist }: { artist: DiscoveryArtist }) {
  const { t } = useLocale()
  return (
    <Link
      to={artist.href}
      className="group flex min-w-0 flex-col items-center gap-3 rounded-xl text-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Avatar className="size-24 sm:size-28">
        {artist.avatarUrl ? (
          <AvatarImage src={artist.avatarUrl} alt="" />
        ) : null}
        <AvatarFallback>
          {artist.displayName.trim().slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex max-w-full flex-col gap-1">
        <h3 className="line-clamp-2 font-semibold wrap-break-word group-hover:underline">
          {artist.displayName}
        </h3>
        <div className="flex max-w-full flex-wrap items-center justify-center gap-x-1 text-sm text-muted-foreground">
          <span className="min-w-0 wrap-anywhere">@{artist.handle}</span>
          <span className="shrink-0">
            · {t("discovery.songsCount", { count: artist.songCount })}
          </span>
        </div>
      </div>
    </Link>
  )
}
