import { Link, useNavigate } from "@tanstack/react-router"
import { useConvex, useMutation, useQuery } from "convex/react"
import { useRef, useState } from "react"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import type { FunctionReturnType } from "convex/server"
import { MAX_LYRICS_TEXT_LENGTH } from "@lyrx/shared"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Button } from "@lyrx/ui/components/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@lyrx/ui/components/card"
import { FieldGroup, FieldSet } from "@lyrx/ui/components/field"
import { toast } from "@lyrx/ui/lib/toast"
import { useLocale } from "@/app/locale-provider"
import { useAppForm } from "@/lib/app-form"
import { getErrorMessage, localizedUiError } from "@/lib/errors"
import { useArtworkSelection } from "@/features/catalogue/hooks/use-catalogue-artwork-upload"
import { CatalogueArtworkCard } from "@/features/catalogue/shared/catalogue-artwork-card"
import { CommunityAccess, CommunityLoading } from "./community-access"
import { CommunityEditorMetadata } from "./community-editor-metadata"
import {
  communityFormOptions,
  communityValuesFromDetail,
  toCommunityMutationInput,
} from "./community-editor-values"
import {
  saveCommunityContribution,
  type CommunitySaveState,
} from "./community-editor-save"
import {
  uploadCommunityArtwork,
  type CommunityArtworkAttempt,
} from "./community-artwork-upload"

type CommunityDetail = FunctionReturnType<typeof api.community.read.getMine>

export function CommunityEditor({
  contributionId,
}: {
  contributionId?: Id<"communityContributions">
}) {
  return (
    <CommunityAccess>
      <EditorData contributionId={contributionId} />
    </CommunityAccess>
  )
}
function EditorData({
  contributionId,
}: {
  contributionId?: Id<"communityContributions">
}) {
  const detail = useQuery(
    api.community.read.getMine,
    contributionId ? { contributionId } : "skip"
  )
  const { t } = useLocale()
  if (contributionId && detail === undefined) return <CommunityLoading />
  if (detail && detail.status !== "published")
    return (
      <Alert>
        <AlertTitle>{t("community.moderated")}</AlertTitle>
      </Alert>
    )
  return <EditorForm key={contributionId ?? "new"} detail={detail} />
}
function EditorForm({ detail }: { detail?: CommunityDetail }) {
  const { t } = useLocale(),
    client = useConvex(),
    navigate = useNavigate()
  const publish = useMutation(api.community.write.publish),
    update = useMutation(api.community.write.update)
  const generateUploadUrl = useMutation(
    api.community.artwork.generateArtworkUploadUrl
  )
  const saveArtwork = useMutation(api.community.artwork.saveArtwork)
  const artwork = useArtworkSelection()
  const artworkAttempt = useRef<CommunityArtworkAttempt>({})
  const [defaultValues] = useState(() => communityValuesFromDetail(detail))
  const saved = useRef<CommunitySaveState<Id<"communityContributions">>>({
    id: detail?._id,
    revision: detail?.revision,
    signature: detail
      ? JSON.stringify(toCommunityMutationInput(defaultValues))
      : undefined,
  })
  const requestId = useRef<string | null>(null),
    publishSignature = useRef<string | null>(null),
    confirmed = useRef<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [artworkFailed, setArtworkFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [matches, setMatches] = useState<{
    signature: string
    rows: Array<{
      id: string
      title: string
      primaryArtist: string
      kind: "official" | "community"
    }>
  } | null>(null)
  const form = useAppForm({
    ...communityFormOptions,
    defaultValues,
    onSubmit: async ({ value }) => {
      setError(null)
      if (!value.lyricsText.trim()) {
        setError(t("studio.lyricsRequired"))
        return
      }
      const input = toCommunityMutationInput(value)
      const signature = JSON.stringify(input)
      const selectedArtwork = artwork.file
      let artworkReconciled = false
      setSaving(true)
      try {
        // A storage id means the last failure may have followed a committed
        // attachment. Confirm that exact claim before editing at a newer revision.
        if (
          selectedArtwork &&
          artworkAttempt.current.storageId &&
          artworkAttempt.current.file === selectedArtwork &&
          saved.current.id &&
          saved.current.revision !== undefined
        ) {
          const expectedRevision = saved.current.revision + 1
          await uploadCommunityArtwork(
            selectedArtwork,
            saved.current.id,
            generateUploadUrl,
            saveArtwork,
            artworkAttempt.current
          )
          const persisted = await client.query(api.community.read.getMine, {
            contributionId: saved.current.id,
          })
          if (persisted.revision !== expectedRevision)
            throw localizedUiError(t("community.revisionConflict"))
          saved.current.revision = expectedRevision
          artworkReconciled = true
          artwork.select(undefined)
          setArtworkFailed(false)
        }
        if (
          saved.current.signature !== signature &&
          confirmed.current !== signature
        ) {
          const rows = (
            await client.query(api.community.read.findMatches, {
              title: value.title,
              primaryArtist: value.primaryArtist,
            })
          ).filter((row) => row.id !== saved.current.id)
          if (rows.length) {
            setMatches({ signature, rows })
            return
          }
        }
        let uploading = false
        const id = await saveCommunityContribution(
          saved.current,
          signature,
          async (existingId, revision) => {
            if (existingId && revision !== undefined) {
              await update({
                ...input,
                clearGenre: !value.genre,
                clearReleaseDate: !value.releaseDate,
                contributionId: existingId,
                expectedRevision: revision,
              })
              return { id: existingId, revision: revision + 1 }
            }
            requestId.current ??= crypto.randomUUID()
            publishSignature.current ??= signature
            const publishedId = await publish({
              ...input,
              requestId: requestId.current,
            })
            saved.current.id = publishedId
            const persisted = await client.query(api.community.read.getMine, {
              contributionId: publishedId,
            })
            if (persisted.revision !== 1)
              throw localizedUiError(t("community.revisionConflict"))
            saved.current.revision = persisted.revision
            if (publishSignature.current !== signature) {
              await update({
                ...input,
                clearGenre: !value.genre,
                clearReleaseDate: !value.releaseDate,
                contributionId: publishedId,
                expectedRevision: persisted.revision,
              })
              return { id: publishedId, revision: persisted.revision + 1 }
            }
            return {
              id: publishedId,
              revision: persisted.revision,
            }
          },
          selectedArtwork && !artworkReconciled
            ? async (savedId) => {
                uploading = true
                try {
                  await uploadCommunityArtwork(
                    selectedArtwork,
                    savedId,
                    generateUploadUrl,
                    saveArtwork,
                    artworkAttempt.current
                  )
                  artwork.select(undefined)
                  setArtworkFailed(false)
                } catch (caught) {
                  setArtworkFailed(true)
                  setError(
                    `${t("community.artworkSavePartial")} ${getErrorMessage(caught, t)}`
                  )
                  throw caught
                }
              }
            : undefined
        ).catch((caught) => {
          if (uploading) return undefined
          throw caught
        })
        if (!id) return
        toast.success(t("community.saved"))
        await navigate({
          to: "/community/$contributionId",
          params: { contributionId: id },
        })
      } catch (caught) {
        setError(getErrorMessage(caught, t))
      } finally {
        setSaving(false)
      }
    },
  })
  return (
    <section className="flex flex-col gap-6">
      <Button asChild variant="ghost" className="self-start">
        <Link to="/community/mine">{t("common.back")}</Link>
      </Button>
      <h1 className="text-3xl font-semibold">
        {t(detail ? "community.edit" : "community.publish")}
      </h1>
      <p className="text-muted-foreground">
        {t("community.publishDescription")}
      </p>
      <CatalogueArtworkCard
        artworkUrl={artwork.previewUrl ?? detail?.artworkUrl}
        inputId="community-artwork"
        pending={saving}
        selectedFile={artwork.file}
        onSelect={artwork.select}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <form.AppForm>
          <Card>
            <CardHeader>
              <CardTitle>{t("community.label")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>{t("catalogue.saveError")}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <FieldSet disabled={saving}>
                <FieldGroup>
                  <form.AppField name="title">
                    {(field) => (
                      <field.TextField
                        label={t("studio.songTitle")}
                        maxLength={160}
                        required
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="primaryArtist">
                    {(field) => (
                      <field.TextField
                        label={t("studio.primaryArtist")}
                        maxLength={120}
                        required
                      />
                    )}
                  </form.AppField>
                  <form.AppField
                    name="lyricsText"
                    validators={{
                      onBlur: ({ value }) =>
                        value.trim() ? undefined : t("studio.lyricsRequired"),
                    }}
                  >
                    {(field) => (
                      <field.TextareaField
                        label={t("studio.lyricsEditor")}
                        placeholder={t("studio.lyricsEditorPlaceholder")}
                        description={t("studio.lyricsEditorDescription")}
                        maxLength={MAX_LYRICS_TEXT_LENGTH}
                        required
                        rows={18}
                        className="min-h-80 resize-y leading-7"
                      />
                    )}
                  </form.AppField>
                  <CommunityEditorMetadata form={form} />
                </FieldGroup>
              </FieldSet>
              {matches ? (
                <Alert>
                  <AlertTitle>{t("community.matches")}</AlertTitle>
                  <AlertDescription>
                    <p>{t("community.matchesDescription")}</p>
                    <ul className="list-inside list-disc">
                      {matches.rows.map((row) => (
                        <li key={row.id}>
                          {row.title} — {row.primaryArtist} (
                          {t(
                            row.kind === "official"
                              ? "community.official"
                              : "community.label"
                          )}
                          )
                        </li>
                      ))}
                    </ul>
                    <form.Subscribe selector={(state) => state.isSubmitting}>
                      {(pending) => (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={pending}
                          onClick={() => {
                            confirmed.current = matches.signature
                            void form.handleSubmit()
                          }}
                        >
                          {t("community.publishAnyway")}
                        </Button>
                      )}
                    </form.Subscribe>
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
            <CardFooter className="justify-end">
              <form.SubmitButton disabled={saving}>
                {t(
                  artworkFailed && artwork.file
                    ? "community.retryArtwork"
                    : detail
                      ? "common.save"
                      : "community.publish"
                )}
              </form.SubmitButton>
            </CardFooter>
          </Card>
        </form.AppForm>
      </form>
    </section>
  )
}
