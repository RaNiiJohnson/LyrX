import { Link } from "@tanstack/react-router"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import { useRef, useState } from "react"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@lyrx/ui/components/alert-dialog"
import { Badge } from "@lyrx/ui/components/badge"
import { Button } from "@lyrx/ui/components/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@lyrx/ui/components/card"
import { FieldGroup } from "@lyrx/ui/components/field"
import { Tabs, TabsList, TabsTrigger } from "@lyrx/ui/components/tabs"
import { toast } from "@lyrx/ui/lib/toast"
import { useLocale } from "@/app/locale-provider"
import { useAppForm } from "@/lib/app-form"
import { getErrorMessage } from "@/lib/errors"
import { CommunityAccess, CommunityLoading } from "./community-access"
import { CommunityEmpty, LoadMore } from "./community-list"

export function CommunityModeration() {
  return (
    <CommunityAccess admin>
      <ReportList />
    </CommunityAccess>
  )
}
function ReportList() {
  const { locale, t } = useLocale()
  const [status, setStatus] = useState<"open" | "resolved">("open")
  const reports = usePaginatedQuery(
    api.community.moderation.listReports,
    { status },
    { initialNumItems: 24 }
  )
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">{t("community.moderation")}</h1>
      <p className="text-muted-foreground">
        {t("community.moderationDescription")}
      </p>
      <Tabs
        value={status}
        onValueChange={(value) =>
          setStatus(value === "resolved" ? "resolved" : "open")
        }
      >
        <TabsList>
          <TabsTrigger value="open">{t("community.openReports")}</TabsTrigger>
          <TabsTrigger value="resolved">
            {t("community.resolvedReports")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {reports.status === "LoadingFirstPage" ? (
        <CommunityLoading />
      ) : reports.results.length === 0 ? (
        <CommunityEmpty kind="reports" />
      ) : (
        reports.results.map((report) => (
          <Card key={report._id}>
            <CardHeader>
              <CardTitle>
                <Link
                  to="/admin/community/$reportId"
                  params={{ reportId: report._id }}
                >
                  {t("community.report")}
                </Link>
              </CardTitle>
              <CardDescription>
                {new Date(report.createdAt).toLocaleDateString(locale, {
                  timeZone: "UTC",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="wrap-anywhere whitespace-pre-wrap">
                {report.reason}
              </p>
            </CardContent>
          </Card>
        ))
      )}
      <LoadMore status={reports.status} loadMore={() => reports.loadMore(24)} />
    </section>
  )
}

export function CommunityReport({
  reportId,
}: {
  reportId: Id<"communityReports">
}) {
  return (
    <CommunityAccess admin>
      <ReportData reportId={reportId} />
    </CommunityAccess>
  )
}
function ReportData({ reportId }: { reportId: Id<"communityReports"> }) {
  const detail = useQuery(api.community.moderation.getReport, { reportId })
  if (detail === undefined) return <CommunityLoading />
  return <ReportDetail key={reportId} reportId={reportId} detail={detail} />
}
type ReportDetailData = NonNullable<
  ReturnType<typeof useQuery<typeof api.community.moderation.getReport>>
>
function ReportDetail({
  reportId,
  detail,
}: {
  reportId: Id<"communityReports">
  detail: ReportDetailData
}) {
  const { t } = useLocale(),
    resolve = useMutation(api.community.moderation.resolve)
  const [error, setError] = useState<string | null>(null),
    [confirmOpen, setConfirmOpen] = useState(false)
  const confirmed = useRef(false)
  const operationPending = useRef(false)
  const form = useAppForm({
    defaultValues: { action: "dismiss", reason: "" },
    onSubmit: async ({ value }) => {
      if (operationPending.current) return
      if (value.action === "remove" && !confirmed.current) {
        setConfirmOpen(true)
        return
      }
      operationPending.current = true
      setError(null)
      try {
        await resolve({
          reportId,
          action:
            value.action === "hide"
              ? "hide"
              : value.action === "remove"
                ? "remove"
                : "dismiss",
          reason: value.reason,
          expectedRevision: detail.contribution.revision,
        })
        toast.success(t("community.resolved"))
      } catch (caught) {
        setError(getErrorMessage(caught, t))
      } finally {
        operationPending.current = false
        confirmed.current = false
      }
    },
  })
  return (
    <section className="flex flex-col gap-6">
      <Button asChild variant="ghost" className="self-start">
        <Link to="/admin/community">{t("common.back")}</Link>
      </Button>
      <h1 className="text-3xl font-semibold">{t("community.moderation")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("community.report")}</CardTitle>
          <CardDescription>{t("community.reportDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="wrap-anywhere whitespace-pre-wrap">
            {detail.report.reason}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("community.reportedRevision")} {detail.report.reportedRevision} ·{" "}
            {t("community.currentRevision")} {detail.contribution.revision}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{detail.contribution.title}</CardTitle>
          <CardDescription>{detail.contribution.primaryArtist}</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">
            {t(
              detail.contribution.status === "published"
                ? "catalogue.published"
                : detail.contribution.status === "hidden"
                  ? "community.hidden"
                  : "community.removed"
            )}
          </Badge>
          <p className="mt-4 leading-7 wrap-anywhere whitespace-pre-wrap">
            {detail.contribution.lyricsText}
          </p>
        </CardContent>
      </Card>
      {detail.decision ? (
        <Alert role="status">
          <AlertTitle>{t("community.resolved")}</AlertTitle>
          <AlertDescription>
            <p>
              {t(
                detail.decision.action === "hide"
                  ? "community.hide"
                  : detail.decision.action === "remove"
                    ? "community.remove"
                    : "community.dismiss"
              )}
            </p>
            <p>{detail.decision.reason}</p>
          </AlertDescription>
        </Alert>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (operationPending.current) return
            confirmed.current = false
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
              <form.AppField name="action">
                {(field) => (
                  <field.SelectField
                    label={t("community.decision")}
                    required
                    options={[
                      { value: "dismiss", label: t("community.dismiss") },
                      { value: "hide", label: t("community.hide") },
                      { value: "remove", label: t("community.remove") },
                    ]}
                  />
                )}
              </form.AppField>
              <form.AppField
                name="reason"
                validators={{
                  onChange: ({ value }) =>
                    value.trim()
                      ? undefined
                      : t("studio.requiredField", {
                          field: t("community.reason"),
                        }),
                  onSubmit: ({ value }) =>
                    value.trim()
                      ? undefined
                      : t("studio.requiredField", {
                          field: t("community.reason"),
                        }),
                }}
              >
                {(field) => (
                  <field.TextareaField
                    id="moderationReason"
                    label={t("community.reason")}
                    required
                    maxLength={1000}
                    rows={4}
                  />
                )}
              </form.AppField>
              <form.SubmitButton className="self-start">
                {t("community.resolve")}
              </form.SubmitButton>
            </FieldGroup>
          </form.AppForm>
        </form>
      )}
      {detail.latestRestoration ? (
        <Alert role="status">
          <AlertTitle>{t("community.restored")}</AlertTitle>
          <AlertDescription>{detail.latestRestoration.reason}</AlertDescription>
        </Alert>
      ) : null}
      {detail.contribution.status === "hidden" &&
      detail.decision?.action === "hide" ? (
        <RestorationForm
          key={`${reportId}:${detail.contribution.revision}`}
          reportId={reportId}
          revision={detail.contribution.revision}
        />
      ) : null}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("community.removeConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("community.removeDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (operationPending.current) return
                confirmed.current = true
                void form.handleSubmit()
              }}
            >
              {t("community.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function RestorationForm({
  reportId,
  revision,
}: {
  reportId: Id<"communityReports">
  revision: number
}) {
  const { t } = useLocale()
  const restore = useMutation(api.community.moderation.restore)
  const operation = useRef<{ requestId: string; reason: string } | null>(null)
  const pending = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)
  const form = useAppForm({
    defaultValues: { reason: "" },
    onSubmit: async ({ value }) => {
      if (pending.current || restored) return
      pending.current = true
      setError(null)
      if (!operation.current || operation.current.reason !== value.reason)
        operation.current = {
          requestId: crypto.randomUUID(),
          reason: value.reason,
        }
      try {
        await restore({
          reportId,
          reason: value.reason,
          expectedRevision: revision,
          requestId: operation.current.requestId,
        })
        setRestored(true)
        operation.current = null
        toast.success(t("community.restored"))
      } catch (caught) {
        setError(getErrorMessage(caught, t))
      } finally {
        pending.current = false
      }
    },
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("community.restore")}</CardTitle>
        <CardDescription>{t("community.restoreDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {restored ? (
          <Alert role="status">
            <AlertTitle>{t("community.restored")}</AlertTitle>
          </Alert>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!pending.current) void form.handleSubmit()
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
                <form.AppField
                  name="reason"
                  validators={{
                    onSubmit: ({ value }) =>
                      value.trim()
                        ? undefined
                        : t("studio.requiredField", {
                            field: t("community.reason"),
                          }),
                    onChange: ({ value }) =>
                      value.trim()
                        ? undefined
                        : t("studio.requiredField", {
                            field: t("community.reason"),
                          }),
                  }}
                >
                  {(field) => (
                    <field.TextareaField
                      id="restorationReason"
                      label={t("community.reason")}
                      required
                      maxLength={1000}
                      rows={3}
                    />
                  )}
                </form.AppField>
                <form.SubmitButton className="self-start">
                  {t("community.restore")}
                </form.SubmitButton>
              </FieldGroup>
            </form.AppForm>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
