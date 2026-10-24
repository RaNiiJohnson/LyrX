import { Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import type { Doc, Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Badge } from "@lyrx/ui/components/badge"
import { Button } from "@lyrx/ui/components/button"
import { Card, CardContent } from "@lyrx/ui/components/card"
import { FieldGroup } from "@lyrx/ui/components/field"
import { Progress } from "@lyrx/ui/components/progress"

import { useLocale } from "@/app/locale-provider"
import { useCatalogueArtworkUpload } from "@/features/catalogue/hooks/use-catalogue-artwork-upload"
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
  const { pending: uploadPending, uploadArtwork } = useCatalogueArtworkUpload(
    songId ? { kind: "song", id: songId } : undefined,
    controller.setError
  )

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
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {songId ? t("studio.songEditTitle") : t("studio.songNewTitle")}
        </h1>
        <p className="text-muted-foreground">{t("studio.description")}</p>
      </div>
      {detail ? (
        <CatalogueArtworkCard
          artworkUrl={detail.artworkUrl}
          inputId="song-artwork"
          pending={uploadPending}
          onSelect={(file) => void uploadArtwork(file)}
        />
      ) : null}
      <Card>
        <CardContent className="pt-6">
          <SongStepProgress step={controller.step} steps={controller.steps} />
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
                {controller.step === 0 ? (
                  <SongBasicsStep form={controller.form} albums={albums} />
                ) : null}
                {controller.step === 1 ? (
                  <SongCreditsStep form={controller.form} />
                ) : null}
                {controller.step === 2 ? (
                  <SongLyricsStep form={controller.form} />
                ) : null}
              </FieldGroup>
              <div className="flex items-center justify-between gap-3 border-t pt-5">
                <Button
                  type="button"
                  variant="outline"
                  disabled={controller.step === 0}
                  onClick={controller.previousStep}
                >
                  {t("studio.previousStep")}
                </Button>
                <div className="flex items-center gap-2">
                  {songId && controller.step < controller.steps.length - 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadPending || controller.saving}
                      onClick={() => void controller.saveCurrentChanges()}
                    >
                      {t("common.save")}
                    </Button>
                  ) : null}
                  {controller.step < controller.steps.length - 1 ? (
                    <Button
                      type="button"
                      disabled={controller.saving}
                      onClick={() => void controller.nextStep()}
                    >
                      {t("studio.nextStep")}
                    </Button>
                  ) : (
                    <controller.form.SubmitButton
                      disabled={uploadPending || controller.saving}
                    >
                      {t("common.save")}
                    </controller.form.SubmitButton>
                  )}
                </div>
              </div>
            </controller.form.AppForm>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}

function SongStepProgress({
  step,
  steps,
}: {
  step: number
  steps: Array<string>
}) {
  const { t } = useLocale()
  return (
    <div className="mb-7 space-y-3" aria-label={t("studio.formProgress")}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{steps[step]}</span>
        <span className="text-muted-foreground">
          {t("studio.stepCount", { current: step + 1, total: steps.length })}
        </span>
      </div>
      <Progress value={((step + 1) / steps.length) * 100} />
      <ol className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        {steps.map((label, index) => (
          <li
            key={label}
            className={
              index === step ? "font-medium text-foreground" : undefined
            }
            aria-current={index === step ? "step" : undefined}
          >
            {label}
          </li>
        ))}
      </ol>
    </div>
  )
}
