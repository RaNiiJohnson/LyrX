import { convexQuery } from "@convex-dev/react-query"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Badge } from "@lyrx/ui/components/badge"
import { FieldGroup } from "@lyrx/ui/components/field"
import { toast } from "@lyrx/ui/lib/toast"
import { useLocale } from "@/app/locale-provider"
import { SongReadOnly } from "@/features/catalogue/song/song-read-only"
import { useAppForm } from "@/lib/app-form"
import { getErrorMessage } from "@/lib/errors"

export function CommunityReader({
  contributionId,
}: {
  contributionId: Id<"communityContributions">
}) {
  const { t } = useLocale()
  const { data: row } = useSuspenseQuery(
    convexQuery(api.community.read.getPublished, { contributionId })
  )
  if (!row)
    return (
      <Alert>
        <AlertTitle>{t("notFound.title")}</AlertTitle>
        <AlertDescription>{t("notFound.description")}</AlertDescription>
      </Alert>
    )
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary">{t("community.label")}</Badge>
        <p>
          {t("community.contributedBy")}{" "}
          <Link
            to="/profiles/$handle"
            params={{ handle: row.contributor.handle }}
            className="underline"
          >
            {row.contributor.displayName}
          </Link>
        </p>
      </div>
      <SongReadOnly
        detail={{
          artworkUrl: null,
          lyricsText: row.lyricsText,
          album: row.albumTitle ? { title: row.albumTitle } : null,
          song: {
            title: row.title,
            primaryArtist: row.primaryArtist,
            guestArtists: [],
            composers: [],
            producers: [],
            writers: [],
            listeningLinks: [],
          },
        }}
      />
      <ReportForm contributionId={contributionId} />
    </section>
  )
}
function ReportForm({
  contributionId,
}: {
  contributionId: Id<"communityContributions">
}) {
  const current = useQuery(api.members.current, {})
  const { t } = useLocale()
  if (current?.state !== "ready")
    return (
      <p className="text-sm text-muted-foreground">
        <Link to="/auth/sign-in" className="underline">
          {t("community.signInToReport")}
        </Link>
      </p>
    )
  return <ReadyReportForm contributionId={contributionId} />
}
function ReadyReportForm({
  contributionId,
}: {
  contributionId: Id<"communityContributions">
}) {
  const { t } = useLocale(),
    report = useMutation(api.community.moderation.report)
  const [error, setError] = useState<string | null>(null),
    [sent, setSent] = useState(false)
  const form = useAppForm({
    defaultValues: { reason: "" },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        await report({ contributionId, reason: value.reason })
        setSent(true)
        toast.success(t("community.reportSent"))
      } catch (caught) {
        setError(getErrorMessage(caught, t))
      }
    },
  })
  return (
    <section className="flex flex-col gap-4" aria-label={t("community.report")}>
      <h2 className="text-lg font-semibold">{t("community.report")}</h2>
      <p className="text-sm text-muted-foreground">
        {t("community.reportDescription")}
      </p>
      {sent ? (
        <Alert role="status">
          <AlertTitle>{t("community.reportSent")}</AlertTitle>
        </Alert>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <form.AppForm>
            <FieldGroup>
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>{t("error.unexpected")}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <form.AppField name="reason">
                {(field) => (
                  <field.TextareaField
                    id="reportReason"
                    label={t("community.reason")}
                    required
                    maxLength={1000}
                    rows={3}
                  />
                )}
              </form.AppField>
              <form.SubmitButton className="self-start" variant="outline">
                {t("community.report")}
              </form.SubmitButton>
            </FieldGroup>
          </form.AppForm>
        </form>
      )}
    </section>
  )
}
