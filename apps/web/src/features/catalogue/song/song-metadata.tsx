import type { MessageKey, SupportedLocale } from "@lyrx/shared"

import { useLocale } from "@/app/locale-provider"
import { ChevronDown } from "lucide-react"

import { Button } from "@lyrx/ui/components/button"
import { Card, CardContent, CardHeader } from "@lyrx/ui/components/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lyrx/ui/components/collapsible"
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
  releaseDate: "studio.releaseDate",
} as const satisfies Record<string, MessageKey>

const creditLabels = {
  additionalCredits: "studio.generalCredits",
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
  const information: Array<{ id: string; label: string; value: string }> =
    collectSongInformation(song).map((item) => ({
      id: item.id,
      label: t(informationLabels[item.id]),
      value: formatInformationValue(item.id, item.value, locale, t),
    }))
  if (albumTitle) {
    information.push({
      id: "album",
      label: t("studio.album"),
      value: albumTitle,
    })
  }
  const credits: Array<{ id: string; label: string; value: string }> =
    collectSongCredits(song).map((item) => ({
      id: item.id,
      label: t(creditLabels[item.id]),
      value: Array.isArray(item.value)
        ? item.value.join(", ")
        : String(item.value),
    }))

  const items = [...information, ...credits]
  if (items.length === 0) return null

  return (
    <Collapsible className="group/details">
      <Card>
        <CardHeader className="p-0">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 w-full justify-between px-4 py-3 text-left"
            >
              {t("studio.detailsAndCredits")}
              <ChevronDown
                data-icon="inline-end"
                className="transition-transform group-data-[state=open]/details:rotate-180"
              />
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="grid grid-cols-2 gap-x-5 gap-y-4 border-t border-border pt-4">
            {items.map((item) => (
              <div key={item.id} className="min-w-0">
                <p className="font-mono text-[0.625rem] font-medium tracking-[0.14em] text-foreground/70 uppercase">
                  {item.label}
                </p>
                <p className="mt-1 text-sm break-words text-foreground">
                  {item.value}
                </p>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

function formatInformationValue(
  id: "genre" | "releaseDate",
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
  if (
    id === "genre" &&
    typeof value === "string" &&
    value in genreMessageKeys
  ) {
    return t(genreMessageKeys[value as Exclude<SongGenre, "other">])
  }
  return Array.isArray(value) ? value.join(", ") : String(value)
}
