import { ExternalLink, Play } from "lucide-react"
import { useId, useState } from "react"

import { Badge } from "@lyrx/ui/components/badge"
import { Button } from "@lyrx/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import { cn } from "@lyrx/ui/lib/utils"

import { useLocale } from "@/app/locale-provider"
import type { ListeningProvider } from "@/features/catalogue/lib/catalogue-form"
import { getListeningEmbed } from "./song-display"

const providerLabels: Record<ListeningProvider, string> = {
  "apple-music": "Apple Music",
  deezer: "Deezer",
  mediafire: "MediaFire",
  other: "Web",
  soundcloud: "SoundCloud",
  spotify: "Spotify",
  youtube: "YouTube",
}

export function SongListeningLinks({
  links,
}: {
  links: Array<{ provider: ListeningProvider; url: string }>
}) {
  const { t } = useLocale()
  const playerIdPrefix = useId()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  if (links.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("studio.listeningLinks")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {links.map((link, index) => {
          const provider = providerLabels[link.provider]
          const embed = getListeningEmbed(link)
          const isActive = activeIndex === index
          const playerId = `${playerIdPrefix}-player-${index}`
          return (
            <div
              key={`${link.provider}-${index}`}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge variant="secondary">{provider}</Badge>
                <div className="flex flex-wrap gap-2">
                  {embed ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-expanded={isActive}
                      aria-controls={playerId}
                      onClick={() => setActiveIndex(isActive ? null : index)}
                    >
                      <Play data-icon="inline-start" />
                      {t(
                        isActive
                          ? "studio.listeningHidePlayer"
                          : "studio.listeningShowPlayer"
                      )}
                    </Button>
                  ) : null}
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                    >
                      {t("studio.listeningOpen", { provider })}
                      <ExternalLink data-icon="inline-end" />
                    </a>
                  </Button>
                </div>
              </div>
              {embed && isActive ? (
                <iframe
                  id={playerId}
                  src={embed.url}
                  title={t("studio.listeningPlayerTitle", { provider })}
                  loading="lazy"
                  allow={
                    embed.kind === "youtube"
                      ? "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      : "encrypted-media; fullscreen; picture-in-picture"
                  }
                  referrerPolicy="strict-origin-when-cross-origin"
                  className={cn(
                    "w-full",
                    embed.kind === "youtube" ? "aspect-video" : "h-40"
                  )}
                />
              ) : null}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
