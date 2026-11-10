import { useLocale } from "@/app/locale-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@lyrx/ui/components/avatar"
import { Badge } from "@lyrx/ui/components/badge"
import { cn } from "@lyrx/ui/lib/utils"
import { Link } from "@tanstack/react-router"
import { ChevronRight, Disc3, Heart, Music2 } from "lucide-react"
import { useState } from "react"

export type DiscoverySong = {
  id: string
  origin: "artist" | "community"
  title: string
  primaryArtist: string
  artworkUrl: string | null
  href: string
  /** Present on public lists; null for a single. */
  albumTitle?: string | null
  likeCount?: number
  /** Two or three public lyric lines; only provided on the home selection. */
  lyricsExcerpt?: string
}
export type DiscoveryAlbum = {
  id: string
  title: string
  artistName: string
  artistHandle: string
  artworkUrl: string | null
  href: string
  firstPublishedAt?: number
  /** Published tracks (capped by the backend) and the first three titles. */
  trackCount?: number
  tracks?: Array<{ id: string; title: string }>
}
export type DiscoveryArtist = {
  handle: string
  displayName: string
  avatarUrl: string | null
  songCount: number
  albumCount: number
  href: string
}

/** "1 titre" / "12 titres", with the locale's own wording. */
export function useTrackCountLabel() {
  const { t } = useLocale()
  return (count: number) =>
    count === 1 ? t("catalogue.trackOne") : t("catalogue.trackMany", { count })
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

/**
 * What a song card says about where the song comes from: "Communauté" for fan
 * lyrics, otherwise "Single" or the album name (nothing when unknown).
 */
function useSongBadge(song: DiscoverySong) {
  const { t } = useLocale()
  if (song.origin === "community") return t("discovery.sourceCommunity")
  if (song.albumTitle === undefined) return null
  return song.albumTitle ?? t("releases.single")
}

export function SongCard({
  song,
  presentation = "row",
}: {
  song: DiscoverySong
  presentation?: "row" | "cover"
}) {
  const badge = useSongBadge(song)
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
          {badge ? (
            <Badge
              variant="secondary"
              className="absolute top-2 left-2 max-w-[calc(100%-1rem)] border-hero-foreground/10 bg-brand-foreground/80 text-hero-foreground"
            >
              <span className="truncate">{badge}</span>
            </Badge>
          ) : null}
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
        {badge ? (
          <Badge
            variant={song.origin === "community" ? "secondary" : "outline"}
            className="max-w-full"
          >
            <span className="truncate">{badge}</span>
          </Badge>
        ) : null}
      </div>
    </Link>
  )
}

/**
 * A record sleeve with a vinyl peeking out on the right. The sleeve itself is
 * `children` so callers keep control of image loading; the wrapper reserves
 * 15% of its width for the disc.
 */
export function AlbumVinyl({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("relative isolate w-full pr-[15%]", className)}>
      <div
        aria-hidden="true"
        data-vinyl
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
      {children}
    </div>
  )
}

export function AlbumCard({ album }: { album: DiscoveryAlbum }) {
  return (
    <Link
      to={album.href}
      className="group flex min-w-0 flex-col gap-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <AlbumVinyl>
        <CoverImage
          src={album.artworkUrl}
          label={album.title}
          album
          className="aspect-square w-full rounded-lg bg-linear-to-br from-primary/35 via-muted to-brand/25 text-foreground shadow-md"
        />
      </AlbumVinyl>
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

/** One song per line, in the style of the Studio list (public, no actions). */
export function SongListRow({ song }: { song: DiscoverySong }) {
  const { t } = useLocale()
  const details = [
    song.primaryArtist,
    song.albumTitle === undefined
      ? undefined
      : (song.albumTitle ?? t("studio.releaseSingle")),
  ].filter((part): part is string => Boolean(part))
  const likes = song.likeCount ?? 0
  return (
    <ListRowLink href={song.href}>
      <CoverImage
        src={song.artworkUrl}
        label={song.title}
        className="size-12 rounded-xl sm:size-14 [&_span]:text-2xl"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold group-hover:underline">
          {song.title}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          <span className="truncate">{details.join(" · ")}</span>
          {likes > 0 ? (
            <span
              className="inline-flex shrink-0 items-center gap-1"
              aria-label={t("studio.likesLabel", { count: likes })}
            >
              <span aria-hidden="true">·</span>
              <Heart className="size-3.5" aria-hidden="true" />
              {likes}
            </span>
          ) : null}
        </span>
      </span>
      {song.origin === "community" ? (
        <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
          {t("discovery.sourceCommunity")}
        </Badge>
      ) : null}
    </ListRowLink>
  )
}

export function AlbumListRow({ album }: { album: DiscoveryAlbum }) {
  const details = [
    album.artistName,
    album.firstPublishedAt
      ? String(new Date(album.firstPublishedAt).getUTCFullYear())
      : undefined,
  ].filter((part): part is string => Boolean(part))
  return (
    <ListRowLink href={album.href}>
      <CoverImage
        src={album.artworkUrl}
        label={album.title}
        album
        className="size-12 rounded-lg sm:size-14 [&_span]:text-2xl"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold group-hover:underline">
          {album.title}
        </span>
        <span className="block truncate text-sm text-muted-foreground">
          {details.join(" · ")}
        </span>
      </span>
    </ListRowLink>
  )
}

function ListRowLink({
  children,
  href,
}: {
  children: React.ReactNode
  href: string
}) {
  return (
    <li className="border-b">
      <Link
        to={href}
        className="group flex min-w-0 items-center gap-3 rounded-md py-3 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-1"
      >
        {children}
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </Link>
    </li>
  )
}

/** Songs as a cover-card grid or as rows, following the chosen view. */
export function SongCollection({
  mode,
  songs,
}: {
  mode: "cards" | "list"
  songs: Array<DiscoverySong>
}) {
  if (mode === "list")
    return (
      <ul className="flex flex-col border-t">
        {songs.map((song) => (
          <SongListRow key={`${song.origin}:${song.id}`} song={song} />
        ))}
      </ul>
    )
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
      {songs.map((song) => (
        <SongCard
          key={`${song.origin}:${song.id}`}
          song={song}
          presentation="cover"
        />
      ))}
    </div>
  )
}

export function AlbumCollection({
  albums,
  mode,
}: {
  albums: Array<DiscoveryAlbum>
  mode: "cards" | "list"
}) {
  if (mode === "list")
    return (
      <ul className="flex flex-col border-t">
        {albums.map((album) => (
          <AlbumListRow key={album.id} album={album} />
        ))}
      </ul>
    )
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
      {albums.map((album) => (
        <AlbumCard key={album.id} album={album} />
      ))}
    </div>
  )
}
