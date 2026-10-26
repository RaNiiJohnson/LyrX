import { Disc3, FileMusic, Pencil } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@lyrx/ui/components/button"
import { Input } from "@lyrx/ui/components/input"
import { Spinner } from "@lyrx/ui/components/spinner"
import { cn } from "@lyrx/ui/lib/utils"

import { useLocale } from "@/app/locale-provider"

export type ArtworkAction = {
  pending: boolean
  onSelect: (file: File | undefined) => void
}

export function CatalogueArtwork({
  artworkUrl,
  kind,
  className,
  action,
}: {
  artworkUrl: string | null
  kind: "song" | "album"
  className?: string
  action?: ArtworkAction
}) {
  const { t } = useLocale()
  const input = useRef<HTMLInputElement>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const label = t(artworkUrl ? "catalogue.editArtwork" : "catalogue.addArtwork")
  const Placeholder = kind === "album" ? Disc3 : FileMusic
  return (
    <div className={cn("relative shrink-0", className)}>
      <div className="grid size-full place-items-center overflow-hidden rounded-2xl bg-muted text-muted-foreground">
        {artworkUrl && failedUrl !== artworkUrl ? (
          <img
            src={artworkUrl}
            alt=""
            className="size-full object-cover"
            onError={() => setFailedUrl(artworkUrl)}
          />
        ) : (
          <Placeholder className="size-8" />
        )}
      </div>
      {action ? (
        <>
          <Input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            tabIndex={-1}
            aria-label={label}
            disabled={action.pending}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ""
              action.onSelect(file)
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-1 bottom-1"
            aria-label={label}
            title={label}
            aria-busy={action.pending}
            disabled={action.pending}
            onClick={() => input.current?.click()}
          >
            {action.pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Pencil data-icon="inline-start" />
            )}
          </Button>
        </>
      ) : null}
    </div>
  )
}
