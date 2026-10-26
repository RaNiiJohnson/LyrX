import { createFormHook, createFormHookContexts } from "@tanstack/react-form"
import { useRef, type ComponentProps, type ReactNode } from "react"
import { TextareaHeadingTools } from "./textarea-heading-tools"

import { Button } from "@lyrx/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@lyrx/ui/components/field"
import { Input } from "@lyrx/ui/components/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lyrx/ui/components/select"
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
  onValueChange?: (value: string) => void
}

function TextField({
  description,
  id,
  label,
  labelExtra,
  onValueChange,
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
        onChange={(event) => {
          field.handleChange(event.target.value)
          onValueChange?.(event.target.value)
        }}
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
  labelExtra?: ReactNode
  onValueChange?: (value: string) => void
  headings?: Array<string>
  headingToolsLabel?: string
}

function TextareaField({
  description,
  id,
  label,
  labelExtra,
  onValueChange,
  headings,
  headingToolsLabel,
  ...textareaProps
}: TextareaFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const field = useFieldContext<string>()
  const inputId = id ?? field.name
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <Field
      data-invalid={invalid || undefined}
      data-disabled={textareaProps.disabled || undefined}
    >
      {labelExtra ? (
        <div className="flex items-center justify-between gap-3">
          <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
          {labelExtra}
        </div>
      ) : (
        <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      )}
      {headings ? (
        <TextareaHeadingTools
          textarea={textareaRef}
          headings={headings}
          label={headingToolsLabel ?? ""}
          disabled={textareaProps.disabled || textareaProps.readOnly}
          onChange={(value) => {
            field.handleChange(value)
            onValueChange?.(value)
          }}
        />
      ) : null}
      <Textarea
        ref={textareaRef}
        {...textareaProps}
        id={inputId}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => {
          field.handleChange(event.target.value)
          onValueChange?.(event.target.value)
        }}
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

type SelectFieldProps = {
  description?: ReactNode
  id?: string
  label: ReactNode
  labelExtra?: ReactNode
  options: Array<{ label: ReactNode; value: string }>
  placeholder?: string
  required?: boolean
  onValueChange?: (value: string) => void
}

function SelectField({
  description,
  id,
  label,
  labelExtra,
  options,
  placeholder,
  required,
  onValueChange,
}: SelectFieldProps) {
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
      <Select
        name={field.name}
        value={field.state.value}
        required={required}
        onValueChange={(value) => {
          field.handleChange(value)
          onValueChange?.(value)
        }}
      >
        <SelectTrigger
          id={inputId}
          className="w-full"
          aria-invalid={invalid || undefined}
          onBlur={field.handleBlur}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
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

export const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    SelectField,
    TextField,
    TextareaField,
  },
  formComponents: {
    SubmitButton,
  },
  fieldContext,
  formContext,
})
