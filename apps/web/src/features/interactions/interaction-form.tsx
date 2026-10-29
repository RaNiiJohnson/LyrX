import { useId, useRef, useState } from "react"
import { Alert, AlertTitle, AlertDescription } from "@lyrx/ui/components/alert"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@lyrx/ui/components/field"
import {
  InputGroup,
  InputGroupTextarea,
  InputGroupAddon,
} from "@lyrx/ui/components/input-group"
import { useAppForm } from "@/lib/app-form"
import { getErrorMessage } from "@/lib/errors"
import { useLocale } from "@/app/locale-provider"
import { CommentAvatar } from "./comment-avatar"

export function CommentComposer({
  name,
  avatarUrl,
  onSubmit,
}: {
  name: string
  avatarUrl?: string | null
  onSubmit: (body: string) => Promise<void>
}) {
  const { t } = useLocale(),
    id = useId(),
    pending = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const form = useAppForm({
    defaultValues: { body: "" },
    onSubmit: async ({ value }) => {
      if (pending.current) return
      pending.current = true
      setError(null)
      try {
        await onSubmit(value.body)
        form.reset()
      } catch (caught) {
        setError(getErrorMessage(caught, t))
      } finally {
        pending.current = false
      }
    },
  })
  return (
    <div className="flex items-start gap-3">
      <CommentAvatar name={name} src={avatarUrl} />
      <form
        className="min-w-0 flex-1"
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
            <form.AppField
              name="body"
              validators={{
                onChange: ({ value }) =>
                  !value.trim() || value.length > 500
                    ? t("interactions.required")
                    : undefined,
                onSubmit: ({ value }) =>
                  !value.trim() || value.length > 500
                    ? t("interactions.required")
                    : undefined,
              }}
            >
              {(field) => (
                <Field
                  data-invalid={
                    (field.state.meta.isTouched && !field.state.meta.isValid) ||
                    undefined
                  }
                >
                  <FieldLabel className="sr-only" htmlFor={id}>
                    {t("interactions.write")}
                  </FieldLabel>
                  <InputGroup className="rounded-2xl bg-muted/15 p-1">
                    <InputGroupTextarea
                      id={id}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={
                        (field.state.meta.isTouched &&
                          !field.state.meta.isValid) ||
                        undefined
                      }
                      aria-describedby={`${id}-count`}
                      placeholder={t("interactions.placeholder")}
                      maxLength={500}
                      rows={2}
                      className="min-h-16 px-3 pt-3 text-sm"
                    />
                    <InputGroupAddon
                      align="block-end"
                      className="justify-between px-3 pb-3"
                    >
                      <span id={`${id}-count`} className="text-xs font-normal">
                        {field.state.value.length} / 500
                      </span>
                      <form.SubmitButton
                        className="h-9 rounded-full px-5"
                        disabled={!field.state.value.trim()}
                      >
                        {t("interactions.publish")}
                      </form.SubmitButton>
                    </InputGroupAddon>
                  </InputGroup>
                  {field.state.meta.isTouched && !field.state.meta.isValid ? (
                    <FieldError>{t("interactions.required")}</FieldError>
                  ) : null}
                </Field>
              )}
            </form.AppField>
          </FieldGroup>
        </form.AppForm>
      </form>
    </div>
  )
}
