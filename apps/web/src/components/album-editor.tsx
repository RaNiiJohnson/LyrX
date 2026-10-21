import { Link, useNavigate } from "@tanstack/react-router"
import { useMutation, useQuery } from "convex/react"
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
import {
  dateInputFromTimestamp,
  namesFromTextarea,
  timestampFromDateInput,
} from "@/lib/catalogue-form"
import { getErrorMessage, localizedUiError } from "@/lib/errors"
import { useLocale } from "./locale-provider"

type AlbumFormValues = {
  title: string
  releaseDate: string
  description: string
  credits: string
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
  const songs = useQuery(api.catalogue.listMySongs, { limit: 100 })

  if ((albumId && detail === undefined) || songs === undefined) {
    return <AlbumEditorSkeleton />
  }
  return (
    <AlbumEditorForm
      key={albumId ?? "new"}
      albumId={albumId}
      detail={detail ?? undefined}
      songs={songs}
    />
  )
}

function AlbumEditorForm({
  albumId,
  detail,
  songs,
}: {
  albumId?: Id<"albums">
  detail?: NonNullable<
    ReturnType<typeof useQuery<typeof api.catalogue.getMyAlbum>>
  >
  songs: NonNullable<
    ReturnType<typeof useQuery<typeof api.catalogue.listMySongs>>
  >
}) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const createAlbum = useMutation(api.catalogue.createAlbum)
  const updateAlbum = useMutation(api.catalogue.updateAlbum)
  const setAlbumTracks = useMutation(api.catalogue.setAlbumTracks)
  const generateUploadUrl = useMutation(api.catalogue.generateArtworkUploadUrl)
  const saveArtwork = useMutation(api.catalogue.saveArtwork)
  const [trackIds, setTrackIds] = useState<Array<Id<"songs">>>(
    detail?.tracks.map(({ song }) => song._id) ?? []
  )
  const [error, setError] = useState<string | null>(null)
  const [uploadPending, setUploadPending] = useState(false)

  const form = useAppForm({
    defaultValues: detail
      ? albumValuesFromDetail(detail)
      : {
          title: "",
          releaseDate: "",
          description: "",
          credits: "",
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
          await updateAlbum({ albumId, ...input })
          await setAlbumTracks({ albumId, songIds: trackIds })
          toast.success(t("catalogue.saved"))
        } else {
          const createdId = await createAlbum(input)
          toast.success(t("catalogue.created"))
          await navigate({
            to: "/studio/albums/$albumId",
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

  async function uploadArtwork(file: File | undefined) {
    if (!albumId || !file) return
    setUploadPending(true)
    setError(null)
    try {
      const resource = { kind: "album" as const, id: albumId }
      const { uploadUrl, intentId } = await generateUploadUrl({ resource })
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!response.ok) throw localizedUiError(t("catalogue.uploadError"))
      const payload: unknown = await response.json()
      if (
        !payload ||
        typeof payload !== "object" ||
        !("storageId" in payload) ||
        typeof payload.storageId !== "string"
      ) {
        throw localizedUiError(t("profile.imageInvalidResponse"))
      }
      await saveArtwork({
        resource,
        intentId,
        storageId: payload.storageId as Id<"_storage">,
      })
      toast.success(t("catalogue.artworkUpdated"))
    } catch (caught) {
      const message = getErrorMessage(caught, t)
      setError(message)
      toast.error(t("catalogue.uploadError"), { description: message })
    } finally {
      setUploadPending(false)
    }
  }

  function moveTrack(index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= trackIds.length) return
    setTrackIds((current) => {
      const next = [...current]
      const currentTrack = next[index]
      const adjacentTrack = next[nextIndex]
      if (!currentTrack || !adjacentTrack) return current
      next[index] = adjacentTrack
      next[nextIndex] = currentTrack
      return next
    })
  }

  const selectedSongs = trackIds.flatMap((id) => {
    const song = songs.find((candidate) => candidate._id === id)
    return song ? [song] : []
  })
  const availableSongs = songs.filter((song) => !trackIds.includes(song._id))

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
              <FieldLabel htmlFor="album-artwork">
                {t("catalogue.artwork")}
              </FieldLabel>
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
                        type="date"
                      />
                    )}
                  </form.AppField>
                </div>
                <form.AppField name="description">
                  {(field) => (
                    <field.TextareaField
                      label={t("studio.albumDescription")}
                      maxLength={5000}
                      rows={5}
                    />
                  )}
                </form.AppField>
                <form.AppField name="credits">
                  {(field) => (
                    <field.TextareaField
                      label={t("studio.albumCredits")}
                      description={t("studio.albumCreditsDescription")}
                      rows={4}
                    />
                  )}
                </form.AppField>
              </FieldSet>

              {albumId ? (
                <FieldSet>
                  <FieldLegend>{t("studio.albumTracks")}</FieldLegend>
                  <FieldDescription>
                    {t("studio.albumTracksDescription")}
                  </FieldDescription>
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
                          onClick={() => moveTrack(index, -1)}
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t("catalogue.moveDown")}
                          disabled={index === selectedSongs.length - 1}
                          onClick={() => moveTrack(index, 1)}
                        >
                          <ArrowDown />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t("studio.removeTrack")}
                          onClick={() =>
                            setTrackIds((current) =>
                              current.filter((id) => id !== song._id)
                            )
                          }
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
                            className="justify-start"
                            onClick={() =>
                              setTrackIds((current) => [...current, song._id])
                            }
                          >
                            <Plus /> {song.title}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
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
  }
}

function AlbumEditorSkeleton() {
  return (
    <div aria-label="Chargement" className="space-y-5">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
