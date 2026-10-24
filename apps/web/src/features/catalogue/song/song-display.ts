import type {
  ListeningProvider,
  SongGenre,
} from "@/features/catalogue/lib/catalogue-form"

export type SongInformationId = "releaseDate" | "genre"
export type SongCreditId =
  | "guestArtists"
  | "writers"
  | "composers"
  | "producers"
  | "label"
  | "additionalCredits"

export type SongDisplayItem<TId extends string> = {
  id: TId
  value: number | string | Array<string>
}

type SongDisplaySource = {
  additionalCredits?: Array<string>
  composers: Array<string>
  genre?: SongGenre
  guestArtists: Array<string>
  label?: string
  otherGenre?: string
  producers: Array<string>
  releaseDate?: number
  writers: Array<string>
}

export function collectSongInformation(
  song: SongDisplaySource
): Array<SongDisplayItem<SongInformationId>> {
  return [
    ...(song.releaseDate === undefined
      ? []
      : [{ id: "releaseDate" as const, value: song.releaseDate }]),
    ...(song.genre
      ? [
          {
            id: "genre" as const,
            value:
              song.genre === "other" && song.otherGenre
                ? song.otherGenre
                : song.genre,
          },
        ]
      : []),
  ]
}

export function collectSongCredits(
  song: SongDisplaySource
): Array<SongDisplayItem<SongCreditId>> {
  return [
    ...(song.guestArtists.length > 0
      ? [{ id: "guestArtists" as const, value: song.guestArtists }]
      : []),
    ...(song.writers.length > 0
      ? [{ id: "writers" as const, value: song.writers }]
      : []),
    ...(song.composers.length > 0
      ? [{ id: "composers" as const, value: song.composers }]
      : []),
    ...(song.producers.length > 0
      ? [{ id: "producers" as const, value: song.producers }]
      : []),
    ...(song.label ? [{ id: "label" as const, value: song.label }] : []),
    ...(song.additionalCredits && song.additionalCredits.length > 0
      ? [
          {
            id: "additionalCredits" as const,
            value: song.additionalCredits,
          },
        ]
      : []),
  ]
}

export type ListeningLink = {
  provider: ListeningProvider
  url: string
}

export type ListeningEmbed = {
  kind: "spotify" | "youtube"
  url: string
}

export type PlayableListeningLink = ListeningLink & {
  embed: ListeningEmbed
}

export function collectPlayableListeningLinks(
  links: Array<ListeningLink>
): Array<PlayableListeningLink> {
  const providers = new Set<ListeningEmbed["kind"]>()
  return links.flatMap((link) => {
    const embed = getListeningEmbed(link)
    if (!embed || providers.has(embed.kind)) return []
    providers.add(embed.kind)
    return [{ ...link, embed }]
  })
}

export function getListeningEmbed(link: ListeningLink): ListeningEmbed | null {
  let url: URL
  try {
    url = new URL(link.url)
  } catch {
    return null
  }
  if (url.protocol !== "https:") return null

  if (link.provider === "youtube") {
    const videoId = youtubeVideoId(url)
    return videoId
      ? {
          kind: "youtube",
          url: `https://www.youtube.com/embed/${videoId}`,
        }
      : null
  }

  if (link.provider === "spotify") {
    if (!isHost(url, "open.spotify.com")) return null
    const parts = url.pathname.split("/").filter(Boolean)
    const [resource, id] = parts[0] === "embed" ? parts.slice(1) : parts
    const supportedResources = new Set([
      "album",
      "artist",
      "episode",
      "playlist",
      "show",
      "track",
    ])
    if (!resource || !id || !supportedResources.has(resource)) return null
    if (!/^[A-Za-z0-9]+$/.test(id)) return null
    return {
      kind: "spotify",
      url: `https://open.spotify.com/embed/${resource}/${id}`,
    }
  }

  return null
}

function youtubeVideoId(url: URL) {
  if (isHost(url, "youtu.be")) {
    return validYoutubeId(url.pathname.split("/").filter(Boolean)[0])
  }
  if (!isHost(url, "youtube.com")) return null
  if (url.pathname === "/watch")
    return validYoutubeId(url.searchParams.get("v"))
  const parts = url.pathname.split("/").filter(Boolean)
  if (parts[0] === "embed" || parts[0] === "shorts") {
    return validYoutubeId(parts[1])
  }
  return null
}

function validYoutubeId(value: string | null | undefined) {
  return value && /^[A-Za-z0-9_-]{6,64}$/.test(value) ? value : null
}

function isHost(url: URL, host: string) {
  return url.hostname === host || url.hostname.endsWith(`.${host}`)
}
