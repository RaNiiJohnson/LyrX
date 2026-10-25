import { Link, useNavigate } from "@tanstack/react-router"
import { useConvex, useMutation, useQuery } from "convex/react"
import { useRef, useState } from "react"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Doc, Id } from "@lyrx/backend/convex/_generated/dataModel"
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
import { FieldGroup } from "@lyrx/ui/components/field"
import { toast } from "@lyrx/ui/lib/toast"
import { useLocale } from "@/app/locale-provider"
import { useAppForm } from "@/lib/app-form"
import { getErrorMessage } from "@/lib/errors"
import { OptionalLabel } from "@/features/catalogue/shared/optional-label"
import { CommunityAccess, CommunityLoading } from "./community-access"

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
function EditorForm({ detail }: { detail?: Doc<"communityContributions"> }) {
  const { t } = useLocale(),
    client = useConvex(),
    navigate = useNavigate()
  const publish = useMutation(api.community.write.publish),
    update = useMutation(api.community.write.update)
  const requestId = useRef<string | null>(null),
    confirmed = useRef<string | null>(null)
  const [error, setError] = useState<string | null>(null)
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
    defaultValues: {
      title: detail?.title ?? "",
      primaryArtist: detail?.primaryArtist ?? "",
      lyricsText: detail?.lyricsText ?? "",
      albumTitle: detail?.albumTitle ?? "",
    },
    onSubmit: async ({ value }) => {
      setError(null)
      const signature = JSON.stringify(value)
      try {
        if (confirmed.current !== signature) {
          const rows = (
            await client.query(api.community.read.findMatches, {
              title: value.title,
              primaryArtist: value.primaryArtist,
            })
          ).filter((row) => row.id !== detail?._id)
          if (rows.length) {
            setMatches({ signature, rows })
            return
          }
        }
        const input = { ...value, albumTitle: value.albumTitle || undefined }
        let id = detail?._id
        if (detail)
          await update({
            ...input,
            contributionId: detail._id,
            expectedRevision: detail.revision,
          })
        else {
          requestId.current ??= crypto.randomUUID()
          id = await publish({ ...input, requestId: requestId.current })
        }
        if (id) {
          toast.success(t("community.saved"))
          await navigate({
            to: "/community/$contributionId",
            params: { contributionId: id },
          })
        }
      } catch (caught) {
        setError(getErrorMessage(caught, t))
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
                <form.AppField name="albumTitle">
                  {(field) => (
                    <field.TextField
                      label={t("community.albumReference")}
                      labelExtra={<OptionalLabel />}
                      maxLength={160}
                    />
                  )}
                </form.AppField>
              </FieldGroup>
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
              <form.SubmitButton>
                {t(detail ? "common.save" : "community.publish")}
              </form.SubmitButton>
            </CardFooter>
          </Card>
        </form.AppForm>
      </form>
    </section>
  )
}
