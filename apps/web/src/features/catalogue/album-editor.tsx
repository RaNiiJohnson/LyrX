import { Link, useNavigate } from "@tanstack/react-router"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ImagePlus,
  Plus,
  Trash2,
} from "lucide-react"
import { useState } from "react"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Badge } from "@lyrx/ui/components/badge"
import { Button } from "@lyrx/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@lyrx/ui/components/field"
import { Input } from "@lyrx/ui/components/input"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { toast } from "@lyrx/ui/lib/toast"

import { useAppForm } from "@/lib/app-form"
import { useCatalogueArtworkUpload } from "@/features/catalogue/hooks/use-catalogue-artwork-upload"
import {
  dateInputFromTimestamp,
  namesFromTextarea,
  timestampFromDateInput,
} from "@/features/catalogue/lib/catalogue-form"
import { getErrorMessage } from "@/lib/errors"
import { useLocale } from "@/app/locale-provider"

type AlbumFormValues = {
  title: string
  releaseDate: string
  description: string
  credits: string
  trackIds: Array<Id<"songs">>
}

type SongSummary = FunctionReturnType<
  typeof api.catalogue.listMySongs
>["page"][number]

function OptionalLabel() {
  const { t } = useLocale()
  return (
    <span className="text-xs font-normal text-muted-foreground">
      {t("common.optional")}
    </span>
  )
}

export function AlbumEditor({ albumId }: { albumId?: Id<"albums"> }) {
  const current = useQuery(api.members.current, {})
  const { t } = useLocale()

  if (current === undefined) return <AlbumEditorSkeleton />
  if (current.state !== "ready" || current.member.role !== "artist") {
    return (
      <Alert>
        <AlertTitle>{t("studio.notArtistTitle")}</AlertTitle>
        <AlertDescription>{t("studio.notArtistDescription")}</AlertDescription>
      </Alert>
    )
  }

  return <ReadyAlbumEditor albumId={albumId} />
}

function ReadyAlbumEditor({ albumId }: { albumId?: Id<"albums"> }) {
  const detail = useQuery(
    api.catalogue.getMyAlbum,
    albumId ? { albumId } : "skip"
  )
  const {
    results: songs,
    status: songsStatus,
    loadMore: loadMoreSongs,
  } = usePaginatedQuery(api.catalogue.listMySongs, {}, { initialNumItems: 50 })

  if ((albumId && detail === undefined) || songsStatus === "LoadingFirstPage") {
    return <AlbumEditorSkeleton />
  }
  return (
    <AlbumEditorForm
      key={albumId ?? "new"}
      albumId={albumId}
      detail={detail ?? undefined}
      songs={songs}
      songsStatus={songsStatus}
      loadMoreSongs={loadMoreSongs}
    />
  )
}

function AlbumEditorForm({
  albumId,
  detail,
  songs,
  songsStatus,
  loadMoreSongs,
}: {
  albumId?: Id<"albums">
  detail?: NonNullable<
    ReturnType<typeof useQuery<typeof api.catalogue.getMyAlbum>>
  >
  songs: Array<SongSummary>
  songsStatus: "CanLoadMore" | "LoadingMore" | "Exhausted"
  loadMoreSongs: (numItems: number) => void
}) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const createAlbum = useMutation(api.catalogue.createAlbum)
  const updateAlbum = useMutation(api.catalogue.updateAlbum)
  const [error, setError] = useState<string | null>(null)
  const { pending: uploadPending, uploadArtwork } = useCatalogueArtworkUpload(
    albumId ? { kind: "album", id: albumId } : undefined,
    setError
  )

  const form = useAppForm({
    defaultValues: detail
      ? albumValuesFromDetail(detail)
      : {
          title: "",
          releaseDate: "",
          description: "",
          credits: "",
          trackIds: [],
        },
    onSubmit: async ({ value }) => {
      setError(null)
      const input = {
        title: value.title,
        releaseDate: timestampFromDateInput(value.releaseDate),
        description: value.description || undefined,
        credits: namesFromTextarea(value.credits),
      }
      try {
        if (albumId) {
          await updateAlbum({ albumId, songIds: value.trackIds, ...input })
          toast.success(t("catalogue.saved"))
          await navigate({
            to: "/studio/albums/$albumId/preview",
            params: { albumId },
          })
        } else {
          const createdId = await createAlbum(input)
          toast.success(t("catalogue.created"))
          await navigate({
            to: "/studio/albums/$albumId/preview",
            params: { albumId: createdId },
          })
        }
      } catch (caught) {
        const message = getErrorMessage(caught, t)
        setError(message)
        toast.error(t("catalogue.saveError"), { description: message })
      }
    },
  })

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/studio">
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
        <Card>
          <CardHeader>
            <CardTitle>{t("catalogue.artwork")}</CardTitle>
            <CardDescription>
              {t("catalogue.artworkDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-[10rem_1fr] sm:items-center">
            <div className="aspect-square overflow-hidden rounded-xl bg-muted">
              {detail.artworkUrl ? (
                <img
                  src={detail.artworkUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <div className="grid size-full place-items-center text-muted-foreground">
                  <ImagePlus className="size-8" />
                </div>
              )}
            </div>
            <Field>
              <div className="flex items-center justify-between gap-3">
                <FieldLabel htmlFor="album-artwork">
                  {t("catalogue.artwork")}
                </FieldLabel>
                <OptionalLabel />
              </div>
              <Input
                id="album-artwork"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadPending}
                onChange={(event) =>
                  void uploadArtwork(event.target.files?.[0])
                }
              />
              <FieldDescription>
                {uploadPending
                  ? t("catalogue.uploading")
                  : t("catalogue.artworkDescription")}
              </FieldDescription>
            </Field>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <form
            className="flex flex-col gap-7"
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void form.handleSubmit()
            }}
          >
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>{t("catalogue.saveError")}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <FieldGroup>
              <FieldSet>
                <FieldLegend>{t("studio.albumNewTitle")}</FieldLegend>
                <div className="grid gap-5 md:grid-cols-2">
                  <form.AppField
                    name="title"
                    validators={{
                      onBlur: ({ value }) =>
                        value.trim() ? undefined : t("studio.songTitle"),
                    }}
                  >
                    {(field) => (
                      <field.TextField
                        label={t("studio.songTitle")}
                        required
                        maxLength={160}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="releaseDate">
                    {(field) => (
                      <field.TextField
                        label={t("studio.releaseDate")}
                        labelExtra={<OptionalLabel />}
                        type="date"
                      />
                    )}
                  </form.AppField>
                </div>
                <form.AppField name="description">
                  {(field) => (
                    <field.TextareaField
                      label={t("studio.albumDescription")}
                      labelExtra={<OptionalLabel />}
                      maxLength={5000}
                      rows={5}
                    />
                  )}
                </form.AppField>
                <form.AppField name="credits">
                  {(field) => (
                    <field.TextareaField
                      label={t("studio.albumCredits")}
                      labelExtra={<OptionalLabel />}
                      description={t("studio.albumCreditsDescription")}
                      rows={4}
                    />
                  )}
                </form.AppField>
              </FieldSet>

              {albumId ? (
                <FieldSet>
                  <div className="flex items-center gap-3">
                    <FieldLegend>{t("studio.albumTracks")}</FieldLegend>
                    <OptionalLabel />
                  </div>
                  <FieldDescription>
                    {t("studio.albumTracksDescription")}
                  </FieldDescription>
                  <form.Field name="trackIds" mode="array">
                    {(tracksField) => {
                      const selectedSongs = tracksField.state.value.flatMap(
                        (id) => {
                          const song = songs.find(
                            (candidate) => candidate._id === id
                          )
                          return song ? [song] : []
                        }
                      )
                      const availableSongs = songs.filter(
                        (song) => !tracksField.state.value.includes(song._id)
                      )
                      return (
                        <div className="space-y-3">
                          {selectedSongs.map((song, index) => (
                            <div
                              key={song._id}
                              className="flex items-center gap-2 rounded-xl border p-3"
                            >
                              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted font-mono text-sm">
                                {index + 1}
                              </span>
                              <span className="min-w-0 flex-1 truncate font-medium">
                                {song.title}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t("catalogue.moveUp")}
                                disabled={index === 0}
                                onClick={() =>
                                  tracksField.moveValue(index, index - 1)
                                }
                              >
                                <ArrowUp />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t("catalogue.moveDown")}
                                disabled={index === selectedSongs.length - 1}
                                onClick={() =>
                                  tracksField.moveValue(index, index + 1)
                                }
                              >
                                <ArrowDown />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t("studio.removeTrack")}
                                onClick={() => tracksField.removeValue(index)}
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          ))}
                          {availableSongs.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              {t("studio.noAvailableTracks")}
                            </p>
                          ) : (
                            <div className="grid gap-2 md:grid-cols-2">
                              {availableSongs.map((song) => (
                                <Button
                                  key={song._id}
                                  type="button"
                                  variant="outline"
                                  className="min-w-0 justify-start"
                                  title={song.title}
                                  onClick={() =>
                                    tracksField.pushValue(song._id)
                                  }
                                >
                                  <Plus />
                                  <span className="min-w-0 truncate">
                                    {song.title}
                                  </span>
                                </Button>
                              ))}
                            </div>
                          )}
                          {songsStatus !== "Exhausted" ? (
                            <Button
                              type="button"
                              variant="outline"
                              disabled={songsStatus === "LoadingMore"}
                              onClick={() => loadMoreSongs(50)}
                            >
                              {songsStatus === "LoadingMore"
                                ? t("common.loading")
                                : t("common.loadMore")}
                            </Button>
                          ) : null}
                        </div>
                      )
                    }}
                  </form.Field>
                </FieldSet>
              ) : null}
            </FieldGroup>

            <div className="flex justify-end">
              <form.AppForm>
                <form.SubmitButton>{t("common.save")}</form.SubmitButton>
              </form.AppForm>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}

function albumValuesFromDetail(
  detail: NonNullable<
    ReturnType<typeof useQuery<typeof api.catalogue.getMyAlbum>>
  >
): AlbumFormValues {
  return {
    title: detail.album.title,
    releaseDate: dateInputFromTimestamp(detail.album.releaseDate),
    description: detail.album.description ?? "",
    credits: detail.album.credits.join("\n"),
    trackIds: detail.tracks.map(({ song }) => song._id),
  }
}

function AlbumEditorSkeleton() {
  const { t } = useLocale()
  return (
    <div aria-label={t("common.loadingCatalogue")} className="space-y-5">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
