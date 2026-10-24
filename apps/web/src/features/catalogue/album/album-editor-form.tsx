import { Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Badge } from "@lyrx/ui/components/badge"
import { Button } from "@lyrx/ui/components/button"
import { Card, CardContent } from "@lyrx/ui/components/card"
import { FieldGroup } from "@lyrx/ui/components/field"

import { useLocale } from "@/app/locale-provider"
import { useCatalogueArtworkUpload } from "@/features/catalogue/hooks/use-catalogue-artwork-upload"
import { CatalogueArtworkCard } from "@/features/catalogue/shared/catalogue-artwork-card"
import { AlbumMetadataFields } from "./album-metadata-fields"
import { AlbumTrackFields } from "./album-track-fields"
import type { AlbumDetail, SongSummary } from "./album-types"
import { useAlbumEditorController } from "./use-album-editor-controller"

export function AlbumEditorForm({
  albumId,
  detail,
  loadMoreSongs,
  songs,
  songsStatus,
}: {
  albumId?: Id<"albums">
  detail?: AlbumDetail
  loadMoreSongs: (count: number) => void
  songs: Array<SongSummary>
  songsStatus: "CanLoadMore" | "LoadingMore" | "Exhausted"
}) {
  const { t } = useLocale()
  const controller = useAlbumEditorController({ albumId, detail })
  const { pending, uploadArtwork } = useCatalogueArtworkUpload(
    albumId ? { kind: "album", id: albumId } : undefined,
    controller.setError
  )

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/studio" search={{ tab: "albums" }}>
            <ArrowLeft /> {t("common.back")}
          </Link>
        </Button>
        {detail ? (
          <div className="flex items-center gap-2">
            <Badge
              variant={
                detail.album.status === "published" ? "default" : "secondary"
              }
            >
              {detail.album.status === "published"
                ? t("catalogue.published")
                : t("catalogue.draft")}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link
                to="/studio/albums/$albumId/preview"
                params={{ albumId: detail.album._id }}
              >
                {t("catalogue.preview")}
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {albumId ? t("studio.albumEditTitle") : t("studio.albumNewTitle")}
        </h1>
        <p className="text-muted-foreground">{t("studio.description")}</p>
      </div>
      {detail ? (
        <CatalogueArtworkCard
          artworkUrl={detail.artworkUrl}
          inputId="album-artwork"
          pending={pending}
          onSelect={(file) => void uploadArtwork(file)}
        />
      ) : null}
      <Card>
        <CardContent className="pt-6">
          <form
            className="flex flex-col gap-7"
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void controller.form.handleSubmit()
            }}
          >
            {controller.error ? (
              <Alert variant="destructive">
                <AlertTitle>{t("catalogue.saveError")}</AlertTitle>
                <AlertDescription>{controller.error}</AlertDescription>
              </Alert>
            ) : null}
            <controller.form.AppForm>
              <FieldGroup>
                <AlbumMetadataFields form={controller.form} />
                {albumId ? (
                  <AlbumTrackFields
                    form={controller.form}
                    songs={songs}
                    status={songsStatus}
                    loadMore={loadMoreSongs}
                  />
                ) : null}
              </FieldGroup>
              <div className="flex justify-end">
                <controller.form.SubmitButton disabled={pending}>
                  {t("common.save")}
                </controller.form.SubmitButton>
              </div>
            </controller.form.AppForm>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
