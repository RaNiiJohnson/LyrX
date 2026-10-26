import { Link } from "@tanstack/react-router"
import { Disc3, Music2 } from "lucide-react"
import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@lyrx/ui/components/avatar"
import { Badge } from "@lyrx/ui/components/badge"
import { cn } from "@lyrx/ui/lib/utils"
import { useLocale } from "@/app/locale-provider"

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
}: {
  src: string | null
  album?: boolean
  className?: string
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
          className="size-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <Icon className="size-7" aria-hidden="true" />
      )}
    </div>
  )
}

export function SongCard({ song }: { song: DiscoverySong }) {
  const { t } = useLocale()
  return (
    <Link
      to={song.href}
      className="group flex min-w-0 items-center gap-4 border-b py-5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:rounded-2xl sm:border sm:bg-card sm:p-5"
    >
      <CoverImage src={song.artworkUrl} className="size-16" />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
        <h3 className="line-clamp-2 font-semibold break-words group-hover:underline">
          {song.title}
        </h3>
        <p className="line-clamp-2 text-sm break-words text-muted-foreground">
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
      <CoverImage
        src={album.artworkUrl}
        album
        className="aspect-square w-full"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="line-clamp-2 font-semibold break-words group-hover:underline">
          {album.title}
        </h3>
        <p className="line-clamp-2 text-sm break-words text-muted-foreground">
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
        <h3 className="line-clamp-2 font-semibold break-words group-hover:underline">
          {artist.displayName}
        </h3>
        <p className="truncate text-sm text-muted-foreground">
          @{artist.handle}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("discovery.songsCount", { count: artist.songCount })}
        </p>
      </div>
    </Link>
  )
}
