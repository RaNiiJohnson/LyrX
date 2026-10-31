import { useLocale } from "@/app/locale-provider"
import { useAppForm } from "@/lib/app-form"
import { getErrorMessage } from "@/lib/errors"
import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import { Button } from "@lyrx/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lyrx/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lyrx/ui/components/dropdown-menu"
import { FieldGroup } from "@lyrx/ui/components/field"
import { Skeleton } from "@lyrx/ui/components/skeleton"
import { toast } from "@lyrx/ui/lib/toast"
import { Link } from "@tanstack/react-router"
import { useQuery } from "convex-helpers/react/cache"
import { useMutation } from "convex/react"
import { Flag, MoreHorizontal } from "lucide-react"
import { useRef, useState } from "react"

export function ReportActions({
  contributionId,
  contributorHandle,
}: {
  contributionId: Id<"communityContributions">
  contributorHandle: string
}) {
  const current = useQuery(api.members.current, {})
  const { t } = useLocale()
  if (current === undefined)
    return (
      <div role="status" aria-label={t("common.loadingAccount")}>
        <Skeleton className="size-9" />
      </div>
    )
  if (current.state === "ready" && current.profile.handle === contributorHandle)
    return null
  return (
    <ReportMenu
      contributionId={contributionId}
      canReport={current.state === "ready"}
    />
  )
}
function ReportMenu({
  contributionId,
  canReport,
}: {
  contributionId: Id<"communityContributions">
  canReport: boolean
}) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const pending = useRef(false)
  const trigger = useRef<HTMLButtonElement>(null)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={trigger}
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t("community.options")}
          >
            <MoreHorizontal data-icon="inline-start" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuGroup>
            {canReport ? (
              <DropdownMenuItem onSelect={() => setOpen(true)}>
                <Flag />
                {t("community.report")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild>
                <Link to="/auth/sign-in">
                  <Flag />
                  {t("community.signInToReport")}
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!pending.current) setOpen(next)
        }}
      >
        <DialogContent
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            trigger.current?.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("community.report")}</DialogTitle>
            <DialogDescription>
              {t("community.reportDescription")}
            </DialogDescription>
          </DialogHeader>
          <ReadyReportForm
            contributionId={contributionId}
            pending={pending}
            close={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
function ReadyReportForm({
  contributionId,
  pending,
  close,
}: {
  contributionId: Id<"communityContributions">
  pending: { current: boolean }
  close: () => void
}) {
  const { t } = useLocale(),
    report = useMutation(api.community.moderation.report)
  const [error, setError] = useState<string | null>(null)
  const form = useAppForm({
    defaultValues: { reason: "" },
    onSubmit: async ({ value }) => {
      if (pending.current) return
      pending.current = true
      setError(null)
      try {
        await report({ contributionId, reason: value.reason })
        toast.success(t("community.reportSent"))
        close()
      } catch (caught) {
        setError(getErrorMessage(caught, t))
      } finally {
        pending.current = false
      }
    },
  })
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (pending.current) return
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
          <form.AppField
            name="reason"
            validators={{
              onSubmit: ({ value }) =>
                value.trim()
                  ? undefined
                  : t("studio.requiredField", { field: t("community.reason") }),
              onChange: ({ value }) =>
                value.trim()
                  ? undefined
                  : t("studio.requiredField", { field: t("community.reason") }),
            }}
          >
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
          <DialogFooter>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={close}
                >
                  {t("common.cancel")}
                </Button>
              )}
            </form.Subscribe>
            <form.SubmitButton variant="outline">
              {t("community.report")}
            </form.SubmitButton>
          </DialogFooter>
        </FieldGroup>
      </form.AppForm>
    </form>
  )
}
