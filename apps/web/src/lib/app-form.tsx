import { createFormHook, createFormHookContexts } from "@tanstack/react-form"
import type { ComponentProps, ReactNode } from "react"

import { Button } from "@lyrx/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@lyrx/ui/components/field"
import { Input } from "@lyrx/ui/components/input"
import { Spinner } from "@lyrx/ui/components/spinner"
import { Textarea } from "@lyrx/ui/components/textarea"

const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts()

type TextFieldProps = Omit<
  ComponentProps<typeof Input>,
  "id" | "name" | "onBlur" | "onChange" | "value"
> & {
  description?: ReactNode
  id?: string
  label: ReactNode
  labelExtra?: ReactNode
}

function TextField({
  description,
  id,
  label,
  labelExtra,
  ...inputProps
}: TextFieldProps) {
  const field = useFieldContext<string>()
  const inputId = id ?? field.name
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <Field data-invalid={invalid || undefined}>
      {labelExtra ? (
        <div className="flex items-center justify-between gap-3">
          <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
          {labelExtra}
        </div>
      ) : (
        <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      )}
      <Input
        {...inputProps}
        id={inputId}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        aria-invalid={invalid || undefined}
      />
      {invalid ? (
        <FieldError errors={toFieldErrors(field.state.meta.errors)} />
      ) : description ? (
        <FieldDescription>{description}</FieldDescription>
      ) : null}
    </Field>
  )
}

type TextareaFieldProps = Omit<
  ComponentProps<typeof Textarea>,
  "id" | "name" | "onBlur" | "onChange" | "value"
> & {
  description?: ReactNode
  id?: string
  label: ReactNode
}

function TextareaField({
  description,
  id,
  label,
  ...textareaProps
}: TextareaFieldProps) {
  const field = useFieldContext<string>()
  const inputId = id ?? field.name
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <Textarea
        {...textareaProps}
        id={inputId}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        aria-invalid={invalid || undefined}
      />
      {invalid ? (
        <FieldError errors={toFieldErrors(field.state.meta.errors)} />
      ) : description ? (
        <FieldDescription>{description}</FieldDescription>
      ) : null}
    </Field>
  )
}

function SubmitButton({
  children,
  disabled,
  ...buttonProps
}: ComponentProps<typeof Button>) {
  const form = useFormContext()

  return (
    <form.Subscribe
      selector={(state) => [state.canSubmit, state.isSubmitting] as const}
    >
      {([canSubmit, isSubmitting]) => (
        <Button
          {...buttonProps}
          type="submit"
          disabled={disabled || !canSubmit || isSubmitting}
        >
          {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
          {children}
        </Button>
      )}
    </form.Subscribe>
  )
}

function toFieldErrors(errors: Array<unknown>) {
  return errors.map((error) => ({
    message:
      typeof error === "string"
        ? error
        : error instanceof Error
          ? error.message
          : "Valeur invalide.",
  }))
}

export const { useAppForm } = createFormHook({
  fieldComponents: {
    TextField,
    TextareaField,
  },
  formComponents: {
    SubmitButton,
  },
  fieldContext,
  formContext,
})
