import { useState } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@lyrx/ui/components/alert-dialog"
import { Alert, AlertDescription } from "@lyrx/ui/components/alert"
import { Button } from "@lyrx/ui/components/button"
import { useLocale } from "@/app/locale-provider"
import { getErrorMessage } from "@/lib/errors"

export function NotebookConfirm({
  title,
  description,
  onClose,
  onConfirm,
  onReturnFocus,
}: {
  title: string
  description: string
  onClose: () => void
  onConfirm: () => Promise<void>
  onReturnFocus?: () => void
}) {
  const { t } = useLocale()
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null)
  async function confirm() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (caught) {
      setError(getErrorMessage(caught, t))
    } finally {
      setBusy(false)
    }
  }
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <AlertDialogContent
        onCloseAutoFocus={
          onReturnFocus
            ? (event) => {
                event.preventDefault()
                onReturnFocus()
              }
            : undefined
        }
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>
            {t("notebook.cancel")}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => void confirm()}
          >
            {title}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
