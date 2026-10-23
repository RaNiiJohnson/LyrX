import { ExternalLink, Play } from "lucide-react"
import { useEffect, useId, useMemo, useState } from "react"

import { Button } from "@lyrx/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lyrx/ui/components/tabs"
import { cn } from "@lyrx/ui/lib/utils"

import { useLocale } from "@/app/locale-provider"
import type { ListeningProvider } from "@/features/catalogue/lib/catalogue-form"
import { collectPlayableListeningLinks } from "./song-display"

const providerLabels: Record<ListeningProvider, string> = {
  "apple-music": "Apple Music",
  deezer: "Deezer",
  mediafire: "MediaFire",
  other: "Web",
  soundcloud: "SoundCloud",
  spotify: "Spotify",
  youtube: "YouTube",
}

type PlayerProvider = "spotify" | "youtube"

export type ListeningPlayerRequest = {
  provider: PlayerProvider
  requestId: number
}

export function SongListeningLinks({
  artworkUrl,
  links,
  playerRequest,
}: {
  artworkUrl: string | null
  links: Array<{ provider: ListeningProvider; url: string }>
  playerRequest?: ListeningPlayerRequest
}) {
  const { t } = useLocale()
  const playerIdPrefix = useId()
  const playableLinks = useMemo(
    () => collectPlayableListeningLinks(links),
    [links]
  )
  const [activeProvider, setActiveProvider] = useState<PlayerProvider | null>(
    playableLinks[0]?.embed.kind ?? null
  )
  const [loadedProvider, setLoadedProvider] = useState<PlayerProvider | null>(
    null
  )

  useEffect(() => {
    if (!playerRequest) return
    if (
      !playableLinks.some((link) => link.embed.kind === playerRequest.provider)
    ) {
      return
    }
    setActiveProvider(playerRequest.provider)
    setLoadedProvider(playerRequest.provider)
  }, [playableLinks, playerRequest])

  if (links.length === 0) return null
  const activeLink = playableLinks.find(
    (link) => link.embed.kind === activeProvider
  )

  const player = activeLink ? (
    <ListeningPlayer
      artworkUrl={artworkUrl}
      id={`${playerIdPrefix}-${activeLink.embed.kind}`}
      isLoaded={loadedProvider === activeLink.embed.kind}
      link={activeLink}
      onLoad={() => setLoadedProvider(activeLink.embed.kind)}
    />
  ) : null

  return (
    <Card id="song-listening" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>{t("studio.listen")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {playableLinks.length > 1 ? (
          <Tabs
            value={activeProvider ?? undefined}
            onValueChange={(value) => {
              setActiveProvider(value as PlayerProvider)
              setLoadedProvider(null)
            }}
          >
            <TabsList className="w-full">
              {playableLinks.map((link) => (
                <TabsTrigger key={link.embed.kind} value={link.embed.kind}>
                  {providerLabels[link.provider]}
                </TabsTrigger>
              ))}
            </TabsList>
            {playableLinks.map((link) => (
              <TabsContent key={link.embed.kind} value={link.embed.kind}>
                {link.embed.kind === activeProvider ? player : null}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          player
        )}
        {links
          .filter((link) => !activeLink || link.url !== activeLink.url)
          .map((link, index) => (
            <Button
              key={`${link.provider}-${index}`}
              asChild
              variant="link"
              className="h-auto justify-start p-0 text-sm"
            >
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
              >
                {t("studio.listeningOpen", {
                  provider: providerLabels[link.provider],
                })}
                <ExternalLink data-icon="inline-end" />
              </a>
            </Button>
          ))}
      </CardContent>
    </Card>
  )
}

function ListeningPlayer({
  artworkUrl,
  id,
  isLoaded,
  link,
  onLoad,
}: {
  artworkUrl: string | null
  id: string
  isLoaded: boolean
  link: ReturnType<typeof collectPlayableListeningLinks>[number]
  onLoad: () => void
}) {
  const { t } = useLocale()
  const provider = providerLabels[link.provider]
  const isYoutube = link.embed.kind === "youtube"

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "relative grid overflow-hidden rounded-xl bg-muted",
          isYoutube ? "aspect-video" : "h-[152px]"
        )}
      >
        {!isLoaded && artworkUrl ? (
          <img
            src={artworkUrl}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-40"
          />
        ) : null}
        {!isLoaded ? (
          <Button
            type="button"
            size="icon-lg"
            aria-label={t("studio.listeningLoadPlayer", { provider })}
            className="z-1 m-auto size-12 rounded-full"
            onClick={onLoad}
          >
            <Play data-icon="inline-start" className="fill-current" />
          </Button>
        ) : (
          <iframe
            id={id}
            src={link.embed.url}
            title={t("studio.listeningPlayerTitle", { provider })}
            loading="lazy"
            allow={
              isYoutube
                ? "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                : "encrypted-media; fullscreen; picture-in-picture"
            }
            referrerPolicy="strict-origin-when-cross-origin"
            className="size-full border-0"
          />
        )}
      </div>
      <Button
        asChild
        variant="link"
        className="h-auto justify-start p-0 text-sm"
      >
        <a href={link.url} target="_blank" rel="noopener noreferrer nofollow">
          {t("studio.listeningOpen", { provider })}
          <ExternalLink data-icon="inline-end" />
        </a>
      </Button>
    </div>
  )
}
