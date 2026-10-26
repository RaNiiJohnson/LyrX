import { Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import type { Doc, Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Badge } from "@lyrx/ui/components/badge"
import { Button } from "@lyrx/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import { FieldGroup } from "@lyrx/ui/components/field"

import { useLocale } from "@/app/locale-provider"
import { CatalogueArtworkCard } from "@/features/catalogue/shared/catalogue-artwork-card"
import { SongBasicsStep } from "./song-basics-step"
import { SongCreditsStep } from "./song-credits-step"
import { SongLyricsStep } from "./song-lyrics-step"
import type { SongDetail } from "./song-types"
import { useSongEditorController } from "./use-song-editor-controller"

export function SongEditorForm({
  detail,
  initialAlbum,
  albums,
  primaryArtist,
  returnAlbumId,
  songId,
}: {
  detail?: SongDetail
  initialAlbum?: Doc<"albums">
  albums: Array<Doc<"albums">>
  primaryArtist: string
  returnAlbumId?: Id<"albums">
  songId?: Id<"songs">
}) {
  const { t } = useLocale()
  const controller = useSongEditorController({
    detail,
    initialAlbum,
    primaryArtist,
    returnAlbumId,
    songId,
  })

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link
            to={returnAlbumId ? "/studio/albums/$albumId/preview" : "/studio"}
            params={returnAlbumId ? { albumId: returnAlbumId } : undefined}
            search={returnAlbumId ? undefined : { tab: "songs" }}
          >
            <ArrowLeft /> {t("common.back")}
          </Link>
        </Button>
        {detail ? (
          <div className="flex items-center gap-2">
            <Badge
              variant={
                detail.song.status === "published" ? "default" : "secondary"
              }
            >
              {detail.song.status === "published"
                ? t("catalogue.published")
                : t("catalogue.draft")}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link
                to="/studio/songs/$songId/preview"
                params={{ songId: detail.song._id }}
                search={{ fromAlbumId: returnAlbumId }}
              >
                {t("catalogue.preview")}
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {songId ? t("studio.songEditTitle") : t("studio.songNewTitle")}
        </h1>
      </div>
      <form
        className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void controller.form.handleSubmit()
        }}
      >
        <aside className="min-w-0 lg:col-start-2 lg:row-start-1">
          <CatalogueArtworkCard artworkUrl={controller.artworkPreviewUrl} inputId="song-artwork" pending={controller.artworkPending || controller.saving} selectedFile={controller.selectedArtwork} onSelect={controller.selectArtwork} />
        </aside>
        <controller.form.AppForm>
          <Card className="min-w-0 lg:col-start-1 lg:row-start-1">
            <CardHeader>
              <CardTitle>{t("studio.essentialInformation")}</CardTitle>
              <CardDescription>
                {t("studio.essentialInformationDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-7">
              {controller.error ? (
                <Alert variant="destructive">
                  <AlertTitle>{t("catalogue.saveError")}</AlertTitle>
                  <AlertDescription>{controller.error}</AlertDescription>
                </Alert>
              ) : null}
              <FieldGroup className="gap-8">
                <SongBasicsStep form={controller.form} albums={albums} />
                <SongLyricsStep form={controller.form} />
                <SongCreditsStep form={controller.form} />
              </FieldGroup>
            </CardContent>
            <CardFooter className="flex-wrap justify-end gap-3 border-t">
              <Button asChild variant="outline"><Link to={returnAlbumId ? "/studio/albums/$albumId/preview" : "/studio"} params={returnAlbumId ? { albumId: returnAlbumId } : undefined} search={returnAlbumId ? undefined : { tab: "songs" }}>{t("common.cancel")}</Link></Button>
              <controller.form.SubmitButton
                disabled={controller.artworkPending || controller.saving}
              >
                {t("common.save")}
              </controller.form.SubmitButton>
            </CardFooter>
          </Card>
        </controller.form.AppForm>
      </form>
    </section>
  )
}
