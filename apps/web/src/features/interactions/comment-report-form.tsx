import { useId, useRef, useState } from "react"
import { Alert, AlertTitle, AlertDescription } from "@lyrx/ui/components/alert"
import { Button } from "@lyrx/ui/components/button"
import {
  Field,
  FieldGroup,
  FieldSet,
  FieldLegend,
  FieldLabel,
} from "@lyrx/ui/components/field"
import { RadioGroup, RadioGroupItem } from "@lyrx/ui/components/radio-group"
import { useAppForm } from "@/lib/app-form"
import { useLocale } from "@/app/locale-provider"
import { getErrorMessage } from "@/lib/errors"

export type ReportCategory = "spam" | "abuse" | "inappropriate" | "other"
export function CommentReportForm({
  close,
  onBusy,
  onSubmit,
}: {
  close: () => void
  onBusy: (busy: boolean) => void
  onSubmit: (category: ReportCategory, reason: string) => Promise<void>
}) {
  const { t } = useLocale(),
    id = useId(),
    pending = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const form = useAppForm({
    defaultValues: { category: "spam" as ReportCategory, reason: "" },
    onSubmit: async ({ value }) => {
      if (pending.current) return
      pending.current = true
      onBusy(true)
      setError(null)
      try {
        await onSubmit(value.category, value.reason)
      } catch (caught) {
        setError(getErrorMessage(caught, t))
      } finally {
        pending.current = false
        onBusy(false)
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
        <FieldGroup className="gap-5">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>{t("error.unexpected")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <form.AppField name="category">
            {(field) => (
              <FieldSet>
                <FieldLegend className="sr-only">
                  {t("interactions.reportCategory")}
                </FieldLegend>
                <RadioGroup
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (
                      ["spam", "abuse", "inappropriate", "other"].includes(
                        value
                      )
                    )
                      field.handleChange(value as ReportCategory)
                  }}
                  aria-label={t("interactions.reportCategory")}
                >
                  {(["spam", "abuse", "inappropriate", "other"] as const).map(
                    (category) => (
                      <Field
                        key={category}
                        orientation="horizontal"
                        className="rounded-xl border px-3.5 py-3 has-[[data-state=checked]]:border-ring has-[[data-state=checked]]:bg-accent/30"
                      >
                        <RadioGroupItem
                          id={`${id}-${category}`}
                          value={category}
                        />
                        <FieldLabel
                          className="flex-1 cursor-pointer font-normal"
                          htmlFor={`${id}-${category}`}
                        >
                          {t(`interactions.category.${category}`)}
                        </FieldLabel>
                      </Field>
                    )
                  )}
                </RadioGroup>
              </FieldSet>
            )}
          </form.AppField>
          <form.AppField name="reason">
            {(field) => (
              <field.TextareaField
                id={`${id}-details`}
                label={t("interactions.details")}
                labelExtra={
                  <span className="text-xs text-muted-foreground">
                    {t("interactions.optional")}
                  </span>
                }
                maxLength={1000}
                rows={3}
                className="rounded-xl"
              />
            )}
          </form.AppField>
          <p className="text-xs text-muted-foreground">
            {t("interactions.reportFooter")}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(busy) => (
                <Button
                  type="button"
                  className="h-11 rounded-full px-5"
                  variant="outline"
                  disabled={busy}
                  onClick={close}
                >
                  {t("common.cancel")}
                </Button>
              )}
            </form.Subscribe>
            <form.SubmitButton className="h-11 rounded-full px-5">
              {t("interactions.sendReport")}
            </form.SubmitButton>
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  )
}
