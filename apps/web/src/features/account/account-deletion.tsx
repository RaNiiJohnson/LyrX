import { useId, useRef, useState } from "react"
import type { MessageKey } from "@lyrx/shared"

import { Alert, AlertDescription, AlertTitle } from "@lyrx/ui/components/alert"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@lyrx/ui/components/alert-dialog"
import { Button } from "@lyrx/ui/components/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"
import { FieldGroup } from "@lyrx/ui/components/field"
import { Spinner } from "@lyrx/ui/components/spinner"

import { useLocale } from "@/app/locale-provider"
import { useAppForm } from "@/lib/app-form"
import { authClient } from "@/lib/auth-client"
import {
  deleteConfirmedAccount,
  signOutForAccountDeletion,
} from "./delete-account"
import type { AccountDeletionOutcome } from "./delete-account"

const errorKeys: Record<
  Exclude<AccountDeletionOutcome, "deleted">,
  MessageKey
> = {
  "confirmation-required": "account.deleteConfirmationRequired",
  "reauth-required": "account.deleteReauthRequired",
  "invalid-password": "account.deleteInvalidPassword",
  "no-password-account": "account.deleteNoPasswordAccount",
  failed: "account.deleteFailed",
}

export function AccountDeletion({
  onPendingChange,
}: {
  onPendingChange?: (pending: boolean) => void
}) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<MessageKey | null>(null)
  const [reauthPending, setReauthPending] = useState(false)
  const operationPending = useRef(false)
  const id = useId()
  const confirmationWord = t("account.deleteConfirmationWord")
  const form = useAppForm({
    defaultValues: { confirmation: "", password: "" },
    onSubmit: async ({ value }) => {
      if (operationPending.current) return
      operationPending.current = true
      onPendingChange?.(true)
      setError(null)
      const outcome = await deleteConfirmedAccount(
        { ...value, confirmationWord },
        {
          deleteUser: (input) => authClient.deleteUser(input),
          // A full navigation drops the old Convex member cache and JWT state.
          redirect: () => window.location.assign("/"),
        }
      )
      if (outcome !== "deleted") {
        setError(errorKeys[outcome])
        operationPending.current = false
        onPendingChange?.(false)
      }
    },
  })

  async function reauthenticate() {
    if (operationPending.current) return
    operationPending.current = true
    onPendingChange?.(true)
    setReauthPending(true)
    const success = await signOutForAccountDeletion({
      signOut: () => authClient.signOut(),
      redirect: () => window.location.assign("/auth/sign-in"),
    })
    if (!success) {
      setError("account.deleteReauthFailed")
      operationPending.current = false
      setReauthPending(false)
      onPendingChange?.(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("account.deleteTitle")}</CardTitle>
        <CardDescription>{t("account.deleteDescription")}</CardDescription>
      </CardHeader>
      <CardFooter>
        <AlertDialog
          open={open}
          onOpenChange={(nextOpen) => {
            if (operationPending.current) return
            setOpen(nextOpen)
            setError(null)
            form.reset()
          }}
        >
          <AlertDialogTrigger asChild>
            <Button variant="destructive">{t("account.deleteAction")}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("account.deleteConfirmTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("account.deleteConfirmDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                event.stopPropagation()
                void form.handleSubmit()
              }}
              className="flex flex-col gap-5"
            >
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>{t("account.deleteErrorTitle")}</AlertTitle>
                  <AlertDescription>
                    {t(error)}
                    {error === "account.deleteReauthRequired" ||
                    error === "account.deleteReauthFailed" ? (
                      <form.Subscribe selector={(state) => state.isSubmitting}>
                        {(pending) => (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={pending || reauthPending}
                            onClick={() => void reauthenticate()}
                          >
                            {reauthPending ? (
                              <Spinner data-icon="inline-start" />
                            ) : null}
                            {t("account.deleteReauthAction")}
                          </Button>
                        )}
                      </form.Subscribe>
                    ) : null}
                  </AlertDescription>
                </Alert>
              ) : null}
              <form.AppForm>
                <form.Subscribe selector={(state) => state.isSubmitting}>
                  {(pending) => (
                    <FieldGroup>
                      <form.AppField
                        name="confirmation"
                        validators={{
                          onChange: ({ value }) =>
                            value.trim() === confirmationWord
                              ? undefined
                              : t("account.deleteConfirmationRequired"),
                        }}
                      >
                        {(field) => (
                          <field.TextField
                            id={`${id}-confirmation`}
                            label={t("account.deleteConfirmationLabel", {
                              word: confirmationWord,
                            })}
                            autoComplete="off"
                            autoCapitalize="characters"
                            spellCheck={false}
                            disabled={pending || reauthPending}
                            required
                          />
                        )}
                      </form.AppField>
                      <form.AppField name="password">
                        {(field) => (
                          <field.TextField
                            id={`${id}-password`}
                            label={t("account.deletePassword")}
                            labelExtra={t("common.optional")}
                            description={t("account.deletePasswordHelp")}
                            type="password"
                            autoComplete="current-password"
                            disabled={pending || reauthPending}
                          />
                        )}
                      </form.AppField>
                    </FieldGroup>
                  )}
                </form.Subscribe>
                <AlertDialogFooter>
                  <form.Subscribe selector={(state) => state.isSubmitting}>
                    {(pending) => (
                      <AlertDialogCancel disabled={pending || reauthPending}>
                        {t("common.cancel")}
                      </AlertDialogCancel>
                    )}
                  </form.Subscribe>
                  <form.Subscribe
                    selector={(state) => state.values.confirmation}
                  >
                    {(confirmation) => (
                      <form.SubmitButton
                        variant="destructive"
                        disabled={
                          reauthPending ||
                          confirmation.trim() !== confirmationWord
                        }
                      >
                        {t("account.deleteConfirmAction")}
                      </form.SubmitButton>
                    )}
                  </form.Subscribe>
                </AlertDialogFooter>
              </form.AppForm>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )
}
