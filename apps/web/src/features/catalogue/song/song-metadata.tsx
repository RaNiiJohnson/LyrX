import type { MessageKey, SupportedLocale } from "@lyrx/shared"

import { useLocale } from "@/app/locale-provider"
import { MetadataCard } from "@/features/catalogue/shared/metadata-card"
import type { MetadataItem } from "@/features/catalogue/shared/metadata-card"
import type { SongGenre } from "@/features/catalogue/lib/catalogue-form"
import { collectSongCredits, collectSongInformation } from "./song-display"

const genreMessageKeys: Record<Exclude<SongGenre, "other">, MessageKey> = {
  electronic: "studio.genreElectronic",
  folk: "studio.genreFolk",
  gospel: "studio.genreGospel",
  "hip-hop": "studio.genreHipHop",
  jazz: "studio.genreJazz",
  pop: "studio.genrePop",
  reggae: "studio.genreReggae",
  rnb: "studio.genreRnb",
  rock: "studio.genreRock",
}

const informationLabels = {
  genre: "studio.genre",
  primaryLanguage: "studio.language",
  releaseDate: "studio.releaseDate",
} as const satisfies Record<string, MessageKey>

const creditLabels = {
  composers: "studio.composers",
  guestArtists: "studio.guestArtists",
  label: "studio.label",
  producers: "studio.producers",
  writers: "studio.writers",
} as const satisfies Record<string, MessageKey>

type SongMetadataSource = Parameters<typeof collectSongInformation>[0]

export function SongMetadata({
  albumTitle,
  song,
}: {
  albumTitle?: string
  song: SongMetadataSource
}) {
  const { locale, t } = useLocale()
  const information: Array<MetadataItem> = collectSongInformation(song).map(
    (item) => ({
      id: item.id,
      label: t(informationLabels[item.id]),
      value: formatInformationValue(item.id, item.value, locale, t),
    })
  )
  if (albumTitle) {
    information.push({
      id: "album",
      label: t("studio.album"),
      value: albumTitle,
    })
  }
  const credits: Array<MetadataItem> = collectSongCredits(song).map((item) => ({
    id: item.id,
    label: t(creditLabels[item.id]),
    value: Array.isArray(item.value)
      ? item.value.join(", ")
      : String(item.value),
  }))

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <MetadataCard title={t("studio.songDetails")} items={information} />
      <MetadataCard title={t("studio.songCredits")} items={credits} />
    </div>
  )
}

function formatInformationValue(
  id: "genre" | "primaryLanguage" | "releaseDate",
  value: number | string | Array<string>,
  locale: SupportedLocale,
  t: (key: MessageKey) => string
) {
  if (id === "releaseDate" && typeof value === "number") {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(value)
  }
  if (id === "primaryLanguage" && typeof value === "string") {
    try {
      return (
        new Intl.DisplayNames([locale], { type: "language" }).of(value) ?? value
      )
    } catch {
      return value
    }
  }
  if (
    id === "genre" &&
    typeof value === "string" &&
    value in genreMessageKeys
  ) {
    return t(genreMessageKeys[value as Exclude<SongGenre, "other">])
  }
  return Array.isArray(value) ? value.join(", ") : String(value)
}
