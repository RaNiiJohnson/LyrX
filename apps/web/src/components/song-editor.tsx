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
import type { Doc, Id } from "@lyrx/backend/convex/_generated/dataModel"
import type { MessageKey } from "@lyrx/shared"
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
import { Progress } from "@lyrx/ui/components/progress"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { Spinner } from "@lyrx/ui/components/spinner"
import { toast } from "@lyrx/ui/lib/toast"

import { useAppForm } from "@/lib/app-form"
import { useCatalogueArtworkUpload } from "@/hooks/use-catalogue-artwork-upload"
import {
  dateInputFromTimestamp,
  emptySongValues,
  LISTENING_PROVIDERS,
  LYRIC_SECTION_KINDS,
  SONG_GENRES,
  type SongFormValues,
  toSongMutationInput,
} from "@/lib/catalogue-form"
import { getErrorMessage } from "@/lib/errors"
import { useLocale } from "./locale-provider"

const genreMessageKeys: Record<(typeof SONG_GENRES)[number], MessageKey> = {
  pop: "studio.genrePop",
  rock: "studio.genreRock",
  "hip-hop": "studio.genreHipHop",
  rnb: "studio.genreRnb",
  electronic: "studio.genreElectronic",
  jazz: "studio.genreJazz",
  folk: "studio.genreFolk",
  gospel: "studio.genreGospel",
  reggae: "studio.genreReggae",
  other: "studio.genreOtherOption",
}

const sectionMessageKeys: Record<
  (typeof LYRIC_SECTION_KINDS)[number],
  MessageKey
> = {
  intro: "studio.sectionIntro",
  verse: "studio.sectionVerse",
  chorus: "studio.sectionChorus",
  bridge: "studio.sectionBridge",
  outro: "studio.sectionOutro",
  custom: "studio.sectionCustom",
}

const providerLabels: Record<(typeof LISTENING_PROVIDERS)[number], string> = {
  spotify: "Spotify",
  "apple-music": "Apple Music",
  youtube: "YouTube",
  deezer: "Deezer",
  soundcloud: "SoundCloud",
  mediafire: "MediaFire",
  other: "",
}

function OptionalLabel() {
  const { t } = useLocale()
  return (
    <span className="text-xs font-normal text-muted-foreground">
      {t("common.optional")}
    </span>
  )
}

export function SongEditor({ songId }: { songId?: Id<"songs"> }) {
  const current = useQuery(api.members.current, {})
  const { t } = useLocale()

  if (current === undefined) return <SongEditorSkeleton />
  if (current.state !== "ready" || current.member.role !== "artist") {
    return (
      <Alert>
        <AlertTitle>{t("studio.notArtistTitle")}</AlertTitle>
        <AlertDescription>{t("studio.notArtistDescription")}</AlertDescription>
      </Alert>
    )
  }

  return (
    <ReadySongEditor
      songId={songId}
      primaryArtist={current.profile.displayName}
    />
  )
}

function ReadySongEditor({
  songId,
  primaryArtist,
}: {
  songId?: Id<"songs">
  primaryArtist: string
}) {
  const detail = useQuery(api.catalogue.getMySong, songId ? { songId } : "skip")

  if (songId && detail === undefined) return <SongEditorSkeleton />
  return (
    <SongEditorForm
      key={songId ?? "new"}
      songId={songId}
      primaryArtist={primaryArtist}
      detail={detail ?? undefined}
    />
  )
}

function SongEditorForm({
  songId,
  primaryArtist,
  detail,
}: {
  songId?: Id<"songs">
  primaryArtist: string
  detail?: NonNullable<
    ReturnType<typeof useQuery<typeof api.catalogue.getMySong>>
  >
}) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const createSong = useMutation(api.catalogue.createSong)
  const updateSong = useMutation(api.catalogue.updateSong)
  const [error, setError] = useState<string | null>(null)
  const { pending: uploadPending, uploadArtwork } = useCatalogueArtworkUpload(
    songId ? { kind: "song", id: songId } : undefined,
    setError
  )
  const [step, setStep] = useState(0)
  const steps = [
    t("studio.stepBasics"),
    t("studio.stepCredits"),
    t("studio.stepLyrics"),
  ]

  const form = useAppForm({
    defaultValues: detail
      ? songValuesFromDetail(detail)
      : emptySongValues(primaryArtist),
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        const input = toSongMutationInput(value)
        if (songId) {
          await updateSong({ songId, ...input })
          toast.success(t("catalogue.saved"))
          await navigate({
            to: "/studio/songs/$songId/preview",
            params: { songId },
          })
        } else {
          const createdId = await createSong(input)
          toast.success(t("catalogue.created"))
          await navigate({
            to: "/studio/songs/$songId/preview",
            params: { songId: createdId },
          })
        }
      } catch (caught) {
        const message = getErrorMessage(caught, t)
        setError(message)
        toast.error(t("catalogue.saveError"), { description: message })
      }
    },
  })

  async function continueToNextStep() {
    if (step === 0) {
      const requiredFields = [
        ["title", t("studio.songTitle")],
        ["primaryArtist", t("studio.primaryArtist")],
        ["primaryLanguage", t("studio.language")],
      ] as const
      for (const [name] of requiredFields) {
        const errors = await form.validateField(name, "blur")
        if (errors.length > 0) {
          document.getElementById(name)?.focus()
          return
        }
      }
    }
    setStep((currentStep) => Math.min(steps.length - 1, currentStep + 1))
  }

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
                <FieldLabel htmlFor="song-artwork">
                  {t("catalogue.artwork")}
                </FieldLabel>
                <OptionalLabel />
              </div>
              <Input
                id="song-artwork"
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
          <div className="mb-7 space-y-3" aria-label={t("studio.formProgress")}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{steps[step]}</span>
              <span className="text-muted-foreground">
                {t("studio.stepCount", {
                  current: step + 1,
                  total: steps.length,
                })}
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
              {step === 0 ? (
                <FieldSet>
                  <FieldLegend>{t("studio.songTitle")}</FieldLegend>
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
                    <form.AppField
                      name="primaryArtist"
                      validators={{
                        onBlur: ({ value }) =>
                          value.trim() ? undefined : t("studio.primaryArtist"),
                      }}
                    >
                      {(field) => (
                        <field.TextField
                          label={t("studio.primaryArtist")}
                          required
                          maxLength={120}
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
                    <form.AppField
                      name="primaryLanguage"
                      validators={{
                        onBlur: ({ value }) =>
                          value.trim() ? undefined : t("studio.language"),
                      }}
                    >
                      {(field) => (
                        <field.TextField
                          label={t("studio.language")}
                          required
                          maxLength={50}
                        />
                      )}
                    </form.AppField>
                    <form.AppField name="genre">
                      {(field) => (
                        <field.SelectField
                          label={t("studio.genre")}
                          labelExtra={<OptionalLabel />}
                          options={SONG_GENRES.map((genre) => ({
                            label: t(genreMessageKeys[genre]),
                            value: genre,
                          }))}
                          placeholder="—"
                        />
                      )}
                    </form.AppField>
                    <form.Subscribe selector={(state) => state.values.genre}>
                      {(genre) =>
                        genre === "other" ? (
                          <form.AppField name="otherGenre">
                            {(field) => (
                              <field.TextField
                                label={t("studio.genreOther")}
                                required
                                maxLength={60}
                              />
                            )}
                          </form.AppField>
                        ) : null
                      }
                    </form.Subscribe>
                  </div>
                  <form.AppField name="guestArtists">
                    {(field) => (
                      <field.TextareaField
                        label={t("studio.guestArtists")}
                        labelExtra={<OptionalLabel />}
                        description={t("studio.creditsDescription")}
                        rows={3}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="description">
                    {(field) => (
                      <field.TextareaField
                        label={t("studio.songDescription")}
                        labelExtra={<OptionalLabel />}
                        maxLength={2000}
                        rows={4}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="context">
                    {(field) => (
                      <field.TextareaField
                        label={t("studio.context")}
                        labelExtra={<OptionalLabel />}
                        maxLength={5000}
                        rows={5}
                      />
                    )}
                  </form.AppField>
                </FieldSet>
              ) : null}

              {step === 1 ? (
                <FieldSet>
                  <FieldLegend>{t("studio.writers")}</FieldLegend>
                  <div className="grid gap-5 md:grid-cols-2">
                    {(
                      [
                        ["writers", "studio.writers"],
                        ["composers", "studio.composers"],
                        ["producers", "studio.producers"],
                      ] as const
                    ).map(([name, label]) => (
                      <form.AppField key={name} name={name}>
                        {(field) => (
                          <field.TextareaField
                            label={t(label)}
                            labelExtra={<OptionalLabel />}
                            description={t("studio.creditsDescription")}
                            rows={3}
                          />
                        )}
                      </form.AppField>
                    ))}
                    <form.AppField name="label">
                      {(field) => (
                        <field.TextField
                          label={t("studio.label")}
                          labelExtra={<OptionalLabel />}
                          maxLength={120}
                        />
                      )}
                    </form.AppField>
                  </div>
                </FieldSet>
              ) : null}

              {step === 1 ? (
                <FieldSet>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <FieldLegend>{t("studio.listeningLinks")}</FieldLegend>
                      <OptionalLabel />
                    </div>
                    <form.Field name="listeningLinks" mode="array">
                      {(linksField) => (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={linksField.state.value.length >= 12}
                          onClick={() =>
                            linksField.pushValue({
                              provider: "spotify",
                              url: "",
                            })
                          }
                        >
                          <Plus /> {t("catalogue.add")}
                        </Button>
                      )}
                    </form.Field>
                  </div>
                  <form.Field name="listeningLinks" mode="array">
                    {(linksField) =>
                      linksField.state.value.length === 0 ? (
                        <FieldDescription>
                          {t("studio.listeningLinks")}
                        </FieldDescription>
                      ) : (
                        <div className="space-y-4">
                          {linksField.state.value.map((_, index) => (
                            <div
                              key={index}
                              className="grid gap-3 rounded-xl border p-4 md:grid-cols-[12rem_1fr_auto] md:items-end"
                            >
                              <form.AppField
                                name={`listeningLinks[${index}].provider`}
                              >
                                {(field) => (
                                  <field.SelectField
                                    label={t("studio.provider")}
                                    options={LISTENING_PROVIDERS.map(
                                      (provider) => ({
                                        label:
                                          provider === "other"
                                            ? t("studio.providerOther")
                                            : providerLabels[provider],
                                        value: provider,
                                      })
                                    )}
                                  />
                                )}
                              </form.AppField>
                              <form.AppField
                                name={`listeningLinks[${index}].url`}
                              >
                                {(field) => (
                                  <field.TextField
                                    label={t("studio.url")}
                                    type="url"
                                    placeholder="https://"
                                  />
                                )}
                              </form.AppField>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t("common.remove")}
                                onClick={() => linksField.removeValue(index)}
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )
                    }
                  </form.Field>
                </FieldSet>
              ) : null}

              {step === 2 ? (
                <FieldSet>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <FieldLegend>{t("studio.lyrics")}</FieldLegend>
                      <OptionalLabel />
                    </div>
                    <form.Field name="sections" mode="array">
                      {(sectionsField) => (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={sectionsField.state.value.length >= 40}
                          onClick={() =>
                            sectionsField.pushValue({
                              kind: "verse",
                              customLabel: "",
                              lines: [{ text: "" }],
                            })
                          }
                        >
                          <Plus /> {t("studio.addSection")}
                        </Button>
                      )}
                    </form.Field>
                  </div>
                  <form.Field name="sections" mode="array">
                    {(sectionsField) => (
                      <div className="space-y-5">
                        {sectionsField.state.value.map(
                          (section, sectionIndex) => (
                            <Card key={section.id ?? sectionIndex}>
                              <CardHeader className="flex-row items-center justify-between gap-3">
                                <CardTitle className="text-base">
                                  {t("studio.section", {
                                    number: sectionIndex + 1,
                                  })}
                                </CardTitle>
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t("catalogue.moveUp")}
                                    disabled={sectionIndex === 0}
                                    onClick={() =>
                                      sectionsField.moveValue(
                                        sectionIndex,
                                        sectionIndex - 1
                                      )
                                    }
                                  >
                                    <ArrowUp />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t("catalogue.moveDown")}
                                    disabled={
                                      sectionIndex ===
                                      sectionsField.state.value.length - 1
                                    }
                                    onClick={() =>
                                      sectionsField.moveValue(
                                        sectionIndex,
                                        sectionIndex + 1
                                      )
                                    }
                                  >
                                    <ArrowDown />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t("studio.removeSection", {
                                      number: sectionIndex + 1,
                                    })}
                                    disabled={
                                      sectionsField.state.value.length === 1
                                    }
                                    onClick={() =>
                                      sectionsField.removeValue(sectionIndex)
                                    }
                                  >
                                    <Trash2 />
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <form.AppField
                                  name={`sections[${sectionIndex}].kind`}
                                >
                                  {(field) => (
                                    <field.SelectField
                                      label={t("studio.sectionType")}
                                      options={LYRIC_SECTION_KINDS.map(
                                        (kind) => ({
                                          label: t(sectionMessageKeys[kind]),
                                          value: kind,
                                        })
                                      )}
                                    />
                                  )}
                                </form.AppField>
                                {section.kind === "custom" ? (
                                  <form.AppField
                                    name={`sections[${sectionIndex}].customLabel`}
                                  >
                                    {(field) => (
                                      <field.TextField
                                        label={t("studio.customSection")}
                                        required
                                        maxLength={80}
                                      />
                                    )}
                                  </form.AppField>
                                ) : null}
                                <form.Field
                                  name={`sections[${sectionIndex}].lines`}
                                  mode="array"
                                >
                                  {(linesField) => (
                                    <div className="space-y-3">
                                      {linesField.state.value.map(
                                        (line, lineIndex) => (
                                          <div
                                            key={line.id ?? lineIndex}
                                            className="flex items-end gap-2"
                                          >
                                            <div className="min-w-0 flex-1">
                                              <form.AppField
                                                name={`sections[${sectionIndex}].lines[${lineIndex}].text`}
                                              >
                                                {(field) => (
                                                  <field.TextField
                                                    label={t("studio.line", {
                                                      number: lineIndex + 1,
                                                    })}
                                                    maxLength={1000}
                                                  />
                                                )}
                                              </form.AppField>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                aria-label={t(
                                                  "catalogue.moveUp"
                                                )}
                                                disabled={lineIndex === 0}
                                                onClick={() =>
                                                  linesField.moveValue(
                                                    lineIndex,
                                                    lineIndex - 1
                                                  )
                                                }
                                              >
                                                <ArrowUp />
                                              </Button>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                aria-label={t(
                                                  "catalogue.moveDown"
                                                )}
                                                disabled={
                                                  lineIndex ===
                                                  linesField.state.value
                                                    .length -
                                                    1
                                                }
                                                onClick={() =>
                                                  linesField.moveValue(
                                                    lineIndex,
                                                    lineIndex + 1
                                                  )
                                                }
                                              >
                                                <ArrowDown />
                                              </Button>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                aria-label={t(
                                                  "studio.removeLine",
                                                  { number: lineIndex + 1 }
                                                )}
                                                disabled={
                                                  linesField.state.value
                                                    .length === 1
                                                }
                                                onClick={() =>
                                                  linesField.removeValue(
                                                    lineIndex
                                                  )
                                                }
                                              >
                                                <Trash2 />
                                              </Button>
                                            </div>
                                          </div>
                                        )
                                      )}
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          linesField.pushValue({ text: "" })
                                        }
                                      >
                                        <Plus /> {t("catalogue.add")}
                                      </Button>
                                    </div>
                                  )}
                                </form.Field>
                              </CardContent>
                            </Card>
                          )
                        )}
                      </div>
                    )}
                  </form.Field>
                </FieldSet>
              ) : null}
            </FieldGroup>

            <div className="flex items-center justify-between gap-3 border-t pt-5">
              <Button
                type="button"
                variant="outline"
                disabled={step === 0}
                onClick={() =>
                  setStep((currentStep) => Math.max(0, currentStep - 1))
                }
              >
                {t("studio.previousStep")}
              </Button>
              {step < steps.length - 1 ? (
                <Button type="button" onClick={() => void continueToNextStep()}>
                  {t("studio.nextStep")}
                </Button>
              ) : (
                <form.AppForm>
                  <form.SubmitButton>
                    {uploadPending ? <Spinner /> : null}
                    {t("common.save")}
                  </form.SubmitButton>
                </form.AppForm>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}

function songValuesFromDetail(
  detail: NonNullable<
    ReturnType<typeof useQuery<typeof api.catalogue.getMySong>>
  >
): SongFormValues {
  return {
    title: detail.song.title,
    primaryArtist: detail.song.primaryArtist,
    guestArtists: detail.song.guestArtists.join("\n"),
    releaseDate: dateInputFromTimestamp(detail.song.releaseDate),
    description: detail.song.description ?? "",
    context: detail.song.context ?? "",
    primaryLanguage: detail.song.primaryLanguage,
    genre: detail.song.genre ?? "",
    otherGenre: detail.song.otherGenre ?? "",
    writers: detail.song.writers.join("\n"),
    composers: detail.song.composers.join("\n"),
    producers: detail.song.producers.join("\n"),
    label: detail.song.label ?? "",
    listeningLinks: detail.song.listeningLinks,
    sections: detail.sections.map(({ section, lines }) => ({
      id: section._id,
      kind: section.kind,
      customLabel: section.customLabel ?? "",
      lines: lines.map((line: Doc<"lyricLines">) => ({
        id: line._id,
        text: line.text,
      })),
    })),
  }
}

function SongEditorSkeleton() {
  const { t } = useLocale()
  return (
    <div aria-label={t("common.loadingCatalogue")} className="space-y-5">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
