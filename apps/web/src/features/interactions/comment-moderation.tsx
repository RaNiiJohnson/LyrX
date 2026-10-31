import { useLocale } from "@/app/locale-provider"
import { CommunityAccess } from "@/features/community/community-access"
import { LoadMore } from "@/features/community/community-list"
import { useAppForm } from "@/lib/app-form"
import { getErrorMessage } from "@/lib/errors"
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
import { Button } from "@lyrx/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import { Empty, EmptyHeader, EmptyTitle } from "@lyrx/ui/components/empty"
import { FieldGroup } from "@lyrx/ui/components/field"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@lyrx/ui/components/tabs"
import { toast } from "@lyrx/ui/lib/toast"
import { Link } from "@tanstack/react-router"
import { usePaginatedQuery, useQuery } from "convex-helpers/react/cache"
import { useMutation } from "convex/react"
import { useRef, useState } from "react"

export function CommentModeration() {
  return (
    <CommunityAccess admin>
      <ReportList />
    </CommunityAccess>
  )
}
function ReportList() {
  const { t, locale } = useLocale()
  const [status, setStatus] = useState<"open" | "resolved">("open")
  const [selected, setSelected] = useState<Id<"commentReports"> | null>(null)
  const page = usePaginatedQuery(
    api.interactions.moderation.listReports,
    { status },
    { initialNumItems: 12 }
  )
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">{t("interactions.moderation")}</h1>
      <p className="text-muted-foreground">
        {t("interactions.moderationHint")}
      </p>
      <Tabs
        value={status}
        onValueChange={(value) => {
          setSelected(null)
          setStatus(value === "resolved" ? "resolved" : "open")
        }}
      >
        <TabsList>
          <TabsTrigger value="open">{t("community.openReports")}</TabsTrigger>
          <TabsTrigger value="resolved">
            {t("community.resolvedReports")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {page.status === "LoadingFirstPage" ? (
        <Skeleton className="h-32 w-full" />
      ) : page.results.length ? (
        page.results.map((report) => (
          <Card key={report._id}>
            <CardHeader>
              <CardTitle>
                {report.category
                  ? t(`interactions.category.${report.category}`)
                  : t("interactions.report")}
              </CardTitle>
              <CardDescription>
                {new Date(report._creationTime).toLocaleString(locale)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="wrap-anywhere whitespace-pre-wrap">
                {report.reason}
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => setSelected(report._id)}>
                {t("interactions.review")}
              </Button>
            </CardFooter>
            {selected === report._id ? (
              <CardContent>
                <ReportDetail key={report._id} reportId={report._id} />
              </CardContent>
            ) : null}
          </Card>
        ))
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("community.empty")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
      <LoadMore status={page.status} loadMore={() => page.loadMore(12)} />
    </section>
  )
}
function ReportDetail({ reportId }: { reportId: Id<"commentReports"> }) {
  const data = useQuery(api.interactions.moderation.getReport, { reportId }),
    { t } = useLocale()
  if (!data) return <Skeleton className="h-32 w-full" />
  return (
    <div className="flex flex-col gap-4">
      {data.source ? (
        <Link className="underline" to={data.source.href}>
          {data.source.title} · {data.source.primaryArtist}
        </Link>
      ) : (
        <p>{t("interactions.unavailable")}</p>
      )}
      <p className="wrap-anywhere whitespace-pre-wrap">
        {data.comment?.status === "public"
          ? data.comment.body
          : t("interactions.deletedBody")}
      </p>
      {data.report.status === "resolved" ? (
        <Alert>
          <AlertTitle>
            {t(
              data.report.action === "remove"
                ? "interactions.remove"
                : "interactions.dismiss"
            )}
          </AlertTitle>
          <AlertDescription>{data.report.decisionReason}</AlertDescription>
        </Alert>
      ) : (
        <DecisionForm reportId={reportId} />
      )}
    </div>
  )
}
function DecisionForm({ reportId }: { reportId: Id<"commentReports"> }) {
  const { t } = useLocale(),
    resolve = useMutation(api.interactions.moderation.resolve)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState(false),
    pending = useRef(false)
  const form = useAppForm({
    defaultValues: { reason: "", action: "dismiss" },
    onSubmit: async ({ value }) => {
      if (pending.current) return
      if (value.action === "remove" && !confirmation) {
        setConfirmation(true)
        return
      }
      pending.current = true
      setError(null)
      try {
        await resolve({
          reportId,
          action: value.action === "remove" ? "remove" : "dismiss",
          reason: value.reason,
        })
        toast.success(t("interactions.resolved"))
      } catch (caught) {
        setError(getErrorMessage(caught, t))
      } finally {
        pending.current = false
        setConfirmation(false)
      }
    },
  })
  return (
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
          <form.AppField name="action">
            {(field) => (
              <field.SelectField
                id={`decision-${reportId}`}
                label={t("community.decision")}
                options={[
                  { value: "dismiss", label: t("interactions.dismiss") },
                  { value: "remove", label: t("interactions.remove") },
                ]}
              />
            )}
          </form.AppField>
          <form.AppField
            name="reason"
            validators={{
              onSubmit: ({ value }) =>
                !value.trim() || value.trim().length > 1000
                  ? t("interactions.required")
                  : undefined,
              onChange: ({ value }) =>
                !value.trim() || value.trim().length > 1000
                  ? t("interactions.required")
                  : undefined,
            }}
          >
            {(field) => (
              <field.TextareaField
                id={`reason-${reportId}`}
                label={t("community.reason")}
                required
                rows={3}
                maxLength={1000}
              />
            )}
          </form.AppField>
          <form.SubmitButton>{t("interactions.resolve")}</form.SubmitButton>
          <AlertDialog
            open={confirmation}
            onOpenChange={(open) => {
              if (!pending.current) setConfirmation(open)
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("interactions.remove")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("interactions.removeHint")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(event) => {
                    event.preventDefault()
                    void form.handleSubmit()
                  }}
                >
                  {t("interactions.remove")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </FieldGroup>
      </form.AppForm>
    </form>
  )
}
