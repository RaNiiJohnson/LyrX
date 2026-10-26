import { useRef, type ReactNode } from "react"
import { Button } from "@lyrx/ui/components/button"
import { Field, FieldDescription, FieldLabel } from "@lyrx/ui/components/field"
import { cn } from "@lyrx/ui/lib/utils"

import { useLocale } from "@/app/locale-provider"

/** A file chooser, not a drop zone: the image preparation policy stays with its caller. */
export function ImageUploadField({
  id,
  label,
  description,
  pending,
  currentImage,
  onSelect,
  preview,
  stacked = false,
  selectedFile,
  clearLabel,
  onClear,
}: {
  id: string
  label: string
  description: string
  pending: boolean
  currentImage: boolean
  onSelect: (file: File) => void
  preview: ReactNode
  stacked?: boolean
  selectedFile?: File
  clearLabel?: string
  onClear?: () => void
}) {
  const { t } = useLocale()
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <Field className="min-w-0" data-disabled={pending}>
      <div className="flex items-center justify-between gap-3">
        <FieldLabel id={`${id}-label`} htmlFor={id}>
          {label}
        </FieldLabel>
        <span className="text-xs text-muted-foreground">
          {t("common.optional")}
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "h-auto min-w-0 justify-start gap-4 border-dashed p-3 whitespace-normal sm:p-4",
          stacked && "lg:flex-col lg:items-start"
        )}
        aria-labelledby={`${id}-label ${id}-action`}
        aria-describedby={`${id}-description`}
        aria-busy={pending}
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        <span className="shrink-0" aria-hidden="true">
          {preview}
        </span>
        <span className="flex min-w-0 flex-col items-start gap-2 text-left">
          <span id={`${id}-action`}>
            {t(currentImage ? "common.changeImage" : "common.chooseImage")}
          </span>
          {selectedFile ? (
            <span className="max-w-full text-sm break-all text-muted-foreground">
              {selectedFile.name}
            </span>
          ) : null}
        </span>
      </Button>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={pending}
        hidden
        aria-describedby={`${id}-description`}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          // Reset only the native picker: callers retain the local File or saved image.
          // Selecting the same file again must work after a preparation/upload error.
          event.currentTarget.value = ""
          if (file) onSelect(file)
        }}
      />
      <FieldDescription id={`${id}-description`}>
        {description}
      </FieldDescription>
      {selectedFile && onClear && clearLabel ? (
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={onClear}
          >
            {clearLabel}
          </Button>
        </div>
      ) : null}
    </Field>
  )
}
