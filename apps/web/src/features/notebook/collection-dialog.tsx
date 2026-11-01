import { useState } from "react"
import { useLocale } from "@/app/locale-provider"
import { useAppForm } from "@/lib/app-form"
import { getErrorMessage } from "@/lib/errors"
import { api } from "@lyrx/backend/convex/_generated/api"
import { useMutation } from "convex/react"
import { Alert, AlertDescription } from "@lyrx/ui/components/alert"
import { Button } from "@lyrx/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@lyrx/ui/components/dialog"
import { FieldGroup } from "@lyrx/ui/components/field"
import { toast } from "@lyrx/ui/lib/toast"
import type { Collection } from "./collection-select"

export function CollectionDialog({
  collection,
  onClose,
  onCreated,
  onReturnFocus,
}: {
  collection?: Collection
  onClose: () => void
  onCreated?: (id: Collection["id"]) => void
  onReturnFocus?: () => void
}) {
  const { t } = useLocale()
  const create = useMutation(api.notebook.write.createCollection),
    rename = useMutation(api.notebook.write.renameCollection)
  const [error, setError] = useState<string | null>(null)
  const form = useAppForm({
    defaultValues: { name: collection?.name ?? "" },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        if (collection)
          await rename({ collectionId: collection.id, name: value.name })
        else {
          const id = await create({ name: value.name })
          onCreated?.(id)
        }
        toast.success(t("notebook.updated"))
        onClose()
      } catch (caught) {
        setError(getErrorMessage(caught, t))
      }
    },
  })
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={
          onReturnFocus
            ? (event) => {
                event.preventDefault()
                onReturnFocus()
              }
            : undefined
        }
      >
        <DialogHeader>
          <DialogTitle>
            {t(collection ? "notebook.rename" : "notebook.newCollection")}
          </DialogTitle>
          <DialogDescription>{t("notebook.nameHint")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <form.AppForm>
            <FieldGroup>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form.AppField
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    !value.trim() || value.trim().length > 60
                      ? t("notebook.nameInvalid")
                      : undefined,
                  onSubmit: ({ value }) =>
                    !value.trim() || value.trim().length > 60
                      ? t("notebook.nameInvalid")
                      : undefined,
                }}
              >
                {(field) => (
                  <field.TextField
                    label={t("notebook.name")}
                    maxLength={60}
                    autoComplete="off"
                  />
                )}
              </form.AppField>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    {t("notebook.cancel")}
                  </Button>
                </DialogClose>
                <form.SubmitButton>{t("notebook.save")}</form.SubmitButton>
              </div>
            </FieldGroup>
          </form.AppForm>
        </form>
      </DialogContent>
    </Dialog>
  )
}
